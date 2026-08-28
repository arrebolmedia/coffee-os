import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PnLService } from '../pnl.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  location: { findMany: jest.fn() },
  ticket: { aggregate: jest.fn() },
  ticketLine: { findMany: jest.fn() },
  expense: { groupBy: jest.fn() },
  organization: { findUnique: jest.fn() },
  // De aquí salen el régimen fiscal y la tasa configurados por la organización.
  setting: { findMany: jest.fn() },
};

describe('PnLService', () => {
  let service: PnLService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PnLService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PnLService>(PnLService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePnL', () => {
    const start = new Date('2026-01-01');
    const end = new Date('2026-01-31');

    beforeEach(() => {
      mockPrismaService.location.findMany.mockResolvedValue([{ id: 'loc_1' }]);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _sum: { total: 150000, discount: 5000, subtotal: 145000 },
      });
      mockPrismaService.ticketLine.findMany.mockResolvedValue([
        { quantity: 1000, product: { cost: 45 } }, // 45,000 COGS
      ]);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.expense.groupBy.mockResolvedValue([
        { category: 'RENT', _sum: { totalAmount: 20000 } },
        { category: 'UTILITIES', _sum: { totalAmount: 3000 } },
        { category: 'MARKETING', _sum: { totalAmount: 2000 } },
      ]);
    });

    it('should calculate PnL with real data', async () => {
      const pnl = await service.calculatePnL('org_1', start, end);

      expect(pnl.organization_id).toBe('org_1');
      // Revenue is net of tax: P&L uses _sum.subtotal (145000), not _sum.total
      // (150000, IVA-inclusive), so margins align with net COGS.
      expect(pnl.gross_revenue).toBe(145000);
      expect(pnl.discounts).toBe(5000);
      expect(pnl.net_revenue).toBe(145000);
      expect(pnl.rent).toBe(20000);
      expect(pnl.utilities).toBe(3000);
      expect(pnl.marketing).toBe(2000);
    });

    it('should calculate COGS from ticket lines (quantity * product.cost)', async () => {
      const pnl = await service.calculatePnL('org_1', start, end);

      // 1000 units * $45 cost = $45,000
      expect(pnl.cogs).toBe(45000);
      expect(pnl.gross_profit).toBe(pnl.net_revenue - 45000);
      expect(pnl.cogs_estimated).toBeUndefined();
    });

    it('should flag cogs_estimated when any product cost is null', async () => {
      mockPrismaService.ticketLine.findMany.mockResolvedValueOnce([
        { quantity: 10, product: { cost: 5 } },
        { quantity: 5, product: { cost: null } },
      ]);

      const pnl = await service.calculatePnL('org_1', start, end);

      expect(pnl.cogs).toBe(50); // only the one with cost counts
      expect(pnl.cogs_estimated).toBe(true);
    });

    it('should use default tax rate (0.30) when org has no setting and flag it', async () => {
      const pnl = await service.calculatePnL('org_1', start, end);
      expect(pnl.tax_rate_default_used).toBe(true);
    });

    /**
     * La tasa de ISR salía fija al 30 % con un TODO que decía que no había
     * dónde guardarla — y sí lo había, la tabla `settings`. El 30 % es la tasa
     * de persona moral: quien tributa en RESICO o como persona física estaba
     * leyendo la utilidad neta de otro.
     */
    describe('tasa de ISR configurable', () => {
      /** Los ajustes fiscales que hay guardados para la organización. */
      function conAjustes(ajustes: Record<string, unknown>) {
        mockPrismaService.setting.findMany.mockResolvedValue(
          Object.entries(ajustes).map(([key, value]) => ({ key, value })),
        );
      }

      /** Sólo la tasa, sin régimen: es la configuración que ya existía. */
      function conAjuste(value: unknown) {
        conAjustes(value === undefined ? {} : { isr_rate: value });
      }

      it('usa la tasa configurada por la organización', async () => {
        conAjuste(0.25);

        const pnl = await service.calculatePnL('org_1', start, end);

        expect(pnl.tax_rate).toBe(0.25);
        expect(pnl.tax_rate_default_used).toBeUndefined();
      });

      it('la busca en la organización que se está consultando', async () => {
        conAjuste(0.25);

        await service.calculatePnL('org_1', start, end);

        expect(mockPrismaService.setting.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              organizationId: 'org_1',
              category: 'finance',
            }),
          }),
        );
      });

      it('acepta el ajuste envuelto en un objeto, que es como los guarda el módulo de settings', async () => {
        conAjuste({ value: 0.1 });

        const pnl = await service.calculatePnL('org_1', start, end);

        expect(pnl.tax_rate).toBe(0.1);
      });

      it('acepta la tasa escrita como texto', async () => {
        // El `value` de un ajuste es Json y puede llegar como cadena.
        conAjuste('0.025');

        const pnl = await service.calculatePnL('org_1', start, end);

        expect(pnl.tax_rate).toBe(0.025);
      });

      it('tasa 0 es una tasa, no «sin configurar»', async () => {
        conAjuste(0);

        const pnl = await service.calculatePnL('org_1', start, end);

        expect(pnl.tax_rate).toBe(0);
        expect(pnl.taxes).toBe(0);
        expect(pnl.tax_rate_default_used).toBeUndefined();
      });

      it('rechaza un 30 escrito pensando en «30 %»', async () => {
        // Cobraría treinta veces la utilidad. Es el mismo error que ya costó
        // caro en el IVA de los productos.
        conAjuste(30);

        const pnl = await service.calculatePnL('org_1', start, end);

        expect(pnl.tax_rate).toBe(0.3);
        expect(pnl.tax_rate_default_used).toBe(true);
      });

      it('rechaza una tasa negativa', async () => {
        conAjuste(-0.1);

        const pnl = await service.calculatePnL('org_1', start, end);

        expect(pnl.tax_rate_default_used).toBe(true);
      });

      it('un ajuste ilegible no tumba el informe', async () => {
        conAjuste('no es un número');

        const pnl = await service.calculatePnL('org_1', start, end);

        expect(pnl.tax_rate).toBe(0.3);
        expect(pnl.tax_rate_default_used).toBe(true);
      });

      it('si la consulta del ajuste falla, se sigue con el valor por defecto', async () => {
        mockPrismaService.setting.findMany.mockRejectedValue(
          new Error('base caída'),
        );

        const pnl = await service.calculatePnL('org_1', start, end);

        expect(pnl.tax_rate).toBe(0.3);
        expect(pnl.tax_rate_default_used).toBe(true);
      });

      it('la tasa aplicada viaja en la respuesta, para que la pantalla no la invente', async () => {
        conAjuste(0.25);

        const pnl = await service.calculatePnL('org_1', start, end);

        // El impuesto tiene que cuadrar con la tasa que se anuncia.
        expect(pnl.taxes).toBeCloseTo(pnl.ebt * pnl.tax_rate, 2);
      });

      /**
       * El régimen decide sobre QUÉ se aplica la tasa, y eso pesa más que la
       * tasa misma: RESICO grava los ingresos cobrados; persona moral, la
       * utilidad.
       */
      describe('régimen fiscal', () => {
        it('en RESICO el impuesto sale de los ingresos, no de la utilidad', async () => {
          conAjustes({ regimen_fiscal: 'resico_pf' });

          const pnl = await service.calculatePnL('org_1', start, end);

          expect(pnl.tax_regime).toBe('resico_pf');
          expect(pnl.tax_basis).toBe('ingresos');
          expect(pnl.taxes).toBeCloseTo(pnl.net_revenue * pnl.tax_rate, 2);
          expect(pnl.tax_rate_default_used).toBeUndefined();
        });

        it('y sale muy distinto de lo que pagaría una persona moral', async () => {
          conAjustes({ regimen_fiscal: 'resico_pf' });
          const resico = await service.calculatePnL('org_1', start, end);

          conAjustes({ regimen_fiscal: 'persona_moral' });
          const moral = await service.calculatePnL('org_1', start, end);

          expect(moral.tax_basis).toBe('utilidad');
          expect(moral.taxes).not.toBeCloseTo(resico.taxes, 0);
        });

        it('sin nada configurado supone persona moral y lo marca', async () => {
          // No porque sea lo más probable en una cafetería, sino porque es lo
          // que el sistema venía calculando: cambiar el valor por defecto
          // movería en silencio todos los informes anteriores.
          conAjustes({});

          const pnl = await service.calculatePnL('org_1', start, end);

          expect(pnl.tax_regime).toBe('persona_moral');
          expect(pnl.tax_rate).toBe(0.3);
          expect(pnl.tax_rate_default_used).toBe(true);
        });

        it('un régimen que no se reconoce no tumba el informe', async () => {
          conAjustes({ regimen_fiscal: 'inventado' });

          const pnl = await service.calculatePnL('org_1', start, end);

          expect(pnl.tax_regime).toBe('persona_moral');
          expect(pnl.tax_rate_default_used).toBe(true);
        });

        it('el régimen manda sobre la tasa suelta', async () => {
          // Con los dos configurados, RESICO calcula con su tabla y la tasa
          // fija se queda para cuando el régimen es `tasa_fija`.
          conAjustes({ regimen_fiscal: 'resico_pf', isr_rate: 0.25 });

          const pnl = await service.calculatePnL('org_1', start, end);

          expect(pnl.tax_regime).toBe('resico_pf');
          expect(pnl.tax_rate).not.toBe(0.25);
        });

        it('el informe de UN SOLO día no sale vacío', async () => {
          // El controlador pasaba `new Date('2026-08-27')` para los dos extremos,
          // así que el rango medía cero y el informe de un día —que es como lo
          // mira un dueño cada noche— devolvía todo en cero. Lo encontró el día
          // de prueba del sandbox: el ISR salía en $0 con ventas del día.
          conAjustes({});

          await service.calculatePnL('org_1', '2026-08-27', '2026-08-27');

          const rango =
            mockPrismaService.ticket.aggregate.mock.calls[0][0].where.closedAt;
          const horas = (rango.lte.getTime() - rango.gte.getTime()) / 3600000;

          expect(horas).toBeCloseTo(24, 1);
        });

        it('el mes se recorta en la zona de la cafetería, no en la del servidor', async () => {
          // Con `new Date(año, mes, 1)`, dentro de un contenedor en UTC, agosto
          // empezaba a las 18:00 del 31 de julio.
          conAjustes({});

          await service.calculateMonthlyPnL('org_1', 2026, 8);

          const rango =
            mockPrismaService.ticket.aggregate.mock.calls[0][0].where.closedAt;
          expect(rango.gte.toISOString()).toBe('2026-08-01T06:00:00.000Z');
          expect(rango.lte.toISOString()).toBe('2026-09-01T05:59:59.999Z');
        });

        it('una tasa sin régimen se sigue entendiendo como tasa fija', async () => {
          // Compatibilidad: quien ya la tenía configurada pedía justo eso.
          conAjustes({ isr_rate: 0.25 });

          const pnl = await service.calculatePnL('org_1', start, end);

          expect(pnl.tax_regime).toBe('tasa_fija');
          expect(pnl.tax_rate).toBe(0.25);
          expect(pnl.tax_basis).toBe('utilidad');
        });
      });
    });

    it('should handle zero revenue gracefully', async () => {
      mockPrismaService.ticket.aggregate.mockResolvedValueOnce({
        _sum: { total: 0, discount: 0, subtotal: 0 },
      });
      mockPrismaService.ticketLine.findMany.mockResolvedValueOnce([]);

      const pnl = await service.calculatePnL('org_1', start, end);

      expect(pnl.net_revenue).toBe(0);
      expect(pnl.gross_margin_percent).toBe(0);
      expect(pnl.net_margin_percent).toBe(0);
    });

    it('should return correct period dates', async () => {
      const pnl = await service.calculatePnL('org_1', start, end);

      expect(pnl.period_start).toEqual(start);
      expect(pnl.period_end).toEqual(end);
    });
  });

  // Regresión: `new Date(undefined)` llegaba a prisma.ticket.aggregate() y
  // reventaba con PrismaClientValidationError -> 500. Debe ser 400.
  describe('date validation', () => {
    const valid = new Date('2026-01-01');

    it('should throw BadRequest instead of hitting Prisma with an Invalid Date', async () => {
      await expect(
        service.calculatePnL('org_1', new Date(undefined as any), valid),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.ticket.aggregate).not.toHaveBeenCalled();
    });

    it('should name the offending parameter in the message', async () => {
      await expect(
        service.calculatePnL('org_1', valid, new Date('no-es-fecha')),
      ).rejects.toThrow(/end_date/);
    });

    it('should reject an inverted range', async () => {
      await expect(
        service.calculatePnL('org_1', new Date('2026-12-31'), valid),
      ).rejects.toThrow(/start_date must be earlier than or equal to end_date/);
    });

    it('should reject out-of-range month without silently rolling over', async () => {
      await expect(
        service.calculateMonthlyPnL('org_1', 2026, 99),
      ).rejects.toThrow(/month/);
      await expect(
        service.calculateMonthlyPnL('org_1', 2026, 0),
      ).rejects.toThrow(/month/);
      expect(mockPrismaService.ticket.aggregate).not.toHaveBeenCalled();
    });

    it('should reject NaN / out-of-range year on monthly and yearly', async () => {
      await expect(
        service.calculateMonthlyPnL('org_1', NaN, 1),
      ).rejects.toThrow(/year/);
      await expect(service.calculateYearlyPnL('org_1', NaN)).rejects.toThrow(
        /year/,
      );
      await expect(service.calculateYearlyPnL('org_1', 1800)).rejects.toThrow(
        /year/,
      );
      expect(mockPrismaService.ticket.aggregate).not.toHaveBeenCalled();
    });

    it('should name which of the two compare periods is invalid', async () => {
      await expect(
        service.comparePeriods(
          'org_1',
          valid,
          new Date('2026-01-31'),
          new Date(undefined as any),
          valid,
        ),
      ).rejects.toThrow(/period2_start/);
    });
  });

  describe('calculateMonthlyPnL', () => {
    it('should calculate for correct month range', async () => {
      mockPrismaService.location.findMany.mockResolvedValue([{ id: 'loc_1' }]);
      mockPrismaService.ticket.aggregate.mockResolvedValue({
        _sum: { total: 100000, discount: 0, subtotal: 100000 },
      });
      mockPrismaService.ticketLine.findMany.mockResolvedValue([]);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.expense.groupBy.mockResolvedValue([]);

      const pnl = await service.calculateMonthlyPnL('org_1', 2026, 4);

      expect(pnl.period_start.getMonth()).toBe(3); // April = index 3
      expect(pnl.period_start.getFullYear()).toBe(2026);
    });
  });

  describe('comparePeriods', () => {
    it('should return change calculations between two periods', async () => {
      mockPrismaService.location.findMany.mockResolvedValue([{ id: 'loc_1' }]);
      mockPrismaService.ticket.aggregate
        .mockResolvedValueOnce({
          _sum: { total: 100000, discount: 0, subtotal: 100000 },
        })
        .mockResolvedValueOnce({
          _sum: { total: 120000, discount: 0, subtotal: 120000 },
        });
      mockPrismaService.ticketLine.findMany.mockResolvedValue([]);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.expense.groupBy.mockResolvedValue([]);

      const result = await service.comparePeriods(
        'org_1',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        new Date('2026-02-01'),
        new Date('2026-02-28'),
      );

      expect(result.period1).toBeDefined();
      expect(result.period2).toBeDefined();
      expect(result.changes.revenue_change).toBe(20000);
      expect(result.changes.revenue_change_percent).toBeCloseTo(20, 0);
    });
  });
});
