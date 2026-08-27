import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PosService } from '../pos.service';
import { PrismaService } from '../../database/prisma.service';
import { InventoryAutomationService } from '../../inventory/inventory-automation.service';
import { fechaEnZona } from '../../../common/time/day-range';

/**
 * El corte de caja y los informes por dia.
 *
 * No tenian ninguna prueba, y llevaban dos formas distintas del mismo error:
 * `getDailyStats` mezclaba `new Date('2026-08-27')` —medianoche UTC— con
 * `setHours` —zona del proceso—, y el informe por rango estiraba el final del
 * dia con `setUTCHours` dejando el principio en medianoche UTC. En un
 * contenedor, que arranca en UTC porque nadie fija `TZ`, la jornada iba de las
 * 18:00 de ayer a las 18:00 de hoy: toda venta de la tarde se sumaba en el
 * corte del dia siguiente.
 *
 * En la base de desarrollo hay seis tickets asi, cobrados entre las 18:11 y las
 * 19:25 del 26 de agosto y guardados como del 27.
 *
 * Todas las comprobaciones son sobre instantes absolutos: es lo unico que no
 * depende de la zona en que corra el proceso.
 */
describe('PosService — el dia de la cafeteria', () => {
  let service: PosService;

  const prisma = {
    organization: { findUnique: jest.fn() },
    location: { findUnique: jest.fn() },
    ticket: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.organization.findUnique.mockResolvedValue({
      timezone: 'America/Mexico_City',
    });
    prisma.ticket.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: InventoryAutomationService,
          useValue: { autoDeductOnSale: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(PosService);
  });

  /** El `where` de la consulta de tickets. */
  function whereUsado() {
    return prisma.ticket.findMany.mock.calls[0][0].where;
  }

  describe('getDailyStats — el corte de caja', () => {
    it('suma el dia completo de la cafeteria', async () => {
      await service.getDailyStats('org1', '2026-08-27');

      const { gte, lte } = whereUsado().closedAt;
      expect(gte.toISOString()).toBe('2026-08-27T06:00:00.000Z');
      expect(lte.toISOString()).toBe('2026-08-28T05:59:59.999Z');
    });

    it('respeta la zona configurada en la organizacion', async () => {
      prisma.organization.findUnique.mockResolvedValue({ timezone: 'UTC' });

      await service.getDailyStats('org1', '2026-08-27');

      expect(whereUsado().closedAt.gte.toISOString()).toBe(
        '2026-08-27T00:00:00.000Z',
      );
    });

    it('cuenta la venta de las 19:25 en su propia jornada', async () => {
      await service.getDailyStats('org1', '2026-08-26');

      const { gte, lte } = whereUsado().closedAt;
      const ventaDeLaTarde = new Date('2026-08-27T01:25:00.000Z');

      expect(ventaDeLaTarde >= gte && ventaDeLaTarde <= lte).toBe(true);
    });

    it('y no la suma tambien al dia siguiente', async () => {
      await service.getDailyStats('org1', '2026-08-27');

      const { gte } = whereUsado().closedAt;
      const ventaDeLaTarde = new Date('2026-08-27T01:25:00.000Z');

      expect(ventaDeLaTarde >= gte).toBe(false);
    });

    it('devuelve la fecha que acaba de sumar, no la de UTC', async () => {
      const stats = await service.getDailyStats('org1', '2026-08-26');

      expect(stats.date).toBe('2026-08-26');
    });

    it('sin fecha usa hoy en la zona de la cafeteria', async () => {
      const stats = await service.getDailyStats('org1');

      expect(stats.date).toBe(fechaEnZona(new Date(), 'America/Mexico_City'));
    });

    it('rechaza una fecha que no existe', async () => {
      await expect(service.getDailyStats('org1', '2026-02-31')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('una zona mal escrita no tumba el corte', async () => {
      // El `timezone` es texto libre en la base. Se cae a la zona por defecto.
      prisma.organization.findUnique.mockResolvedValue({
        timezone: 'Marte/Olympus_Mons',
      });

      await service.getDailyStats('org1', '2026-08-27');

      expect(whereUsado().closedAt.gte.toISOString()).toBe(
        '2026-08-27T06:00:00.000Z',
      );
    });
  });

  describe('findOrdersByOrgAndDateRange — el informe por rango', () => {
    it('llega hasta el final del ultimo dia, no hasta su medianoche', async () => {
      // Con `new Date('2026-08-31')` como `lte` el informe se quedaba en la
      // medianoche UTC del 31: perdia el dia entero salvo la madrugada.
      await service.findOrdersByOrgAndDateRange(
        'org1',
        '2026-08-01',
        '2026-08-31',
      );

      const { gte, lte } = whereUsado().openedAt;
      expect(gte.toISOString()).toBe('2026-08-01T06:00:00.000Z');
      expect(lte.toISOString()).toBe('2026-09-01T05:59:59.999Z');
    });

    it('respeta un instante concreto en vez de redondearlo al dia', async () => {
      // Quien pide una hora exacta esta pidiendo esa hora.
      await service.findOrdersByOrgAndDateRange(
        'org1',
        '2026-08-27T14:00:00.000Z',
        '2026-08-27T16:00:00.000Z',
      );

      const { gte, lte } = whereUsado().openedAt;
      expect(gte.toISOString()).toBe('2026-08-27T14:00:00.000Z');
      expect(lte.toISOString()).toBe('2026-08-27T16:00:00.000Z');
    });

    it('rechaza un rango que no son fechas', async () => {
      await expect(
        service.findOrdersByOrgAndDateRange('org1', 'ayer', 'hoy'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findTodayOrdersByOrg', () => {
    it('«hoy» es el dia de la cafeteria, no el del servidor', async () => {
      await service.findTodayOrdersByOrg('org1');

      const { gte, lte } = whereUsado().openedAt;

      expect(fechaEnZona(gte, 'America/Mexico_City')).toBe(
        fechaEnZona(new Date(), 'America/Mexico_City'),
      );
      expect(lte.getTime() - gte.getTime()).toBe(24 * 60 * 60 * 1000 - 1);
    });
  });
});
