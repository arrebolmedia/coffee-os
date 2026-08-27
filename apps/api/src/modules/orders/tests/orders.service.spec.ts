import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { PrismaService } from '../../database/prisma.service';
import { InventoryAutomationService } from '../../inventory/inventory-automation.service';

/**
 * `OrdersService` no tenia ningun test propio, y por ahi se colo el filtro de
 * fecha: `new Date('2026-08-27')` se parsea como medianoche UTC pero
 * `setHours` opera en la zona del proceso, asi que el rango salia desplazado un
 * dia entero. La pantalla de ordenes llevaba enseniando las de ayer.
 *
 * El arreglo de aquel dia dejo el recorte en la zona del proceso, que en el
 * portatil de desarrollo coincide con la de la cafeteria y en un contenedor no:
 * alli el dia iba de las 18:00 a las 18:00. Ahora se recorta en la zona
 * configurada en la organizacion.
 */
describe('OrdersService', () => {
  let service: OrdersService;

  const prisma = {
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    // De aqui sale la zona con la que se recorta el dia.
    organization: { findUnique: jest.fn() },
    location: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const inventoryAutomation = { autoDeductOnSale: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockResolvedValue([[], 0]);
    prisma.organization.findUnique.mockResolvedValue({
      timezone: 'America/Mexico_City',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: InventoryAutomationService,
          useValue: inventoryAutomation,
        },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  /** El `where` con el que se llamo a findMany. */
  function whereUsado() {
    return prisma.order.findMany.mock.calls[0][0].where;
  }

  describe('filtro por fecha', () => {
    // Todo se comprueba sobre instantes absolutos. La primera version de estos
    // tests miraba componentes locales (`gte.getHours() === 0`) y pasaba en el
    // portatil de desarrollo por pura coincidencia: alli la zona del proceso
    // era America/Mexico_City, la misma de la cafeteria. Bajo `TZ=UTC` fallaban
    // aunque el codigo fuese correcto — median la zona del proceso, no el
    // recorte del dia.
    it('cubre el dia completo de la cafeteria', async () => {
      await service.findAll({ date: '2026-08-27', organizationId: 'org1' });

      const { gte, lte } = whereUsado().orderedAt;

      expect(gte.toISOString()).toBe('2026-08-27T06:00:00.000Z');
      expect(lte.toISOString()).toBe('2026-08-28T05:59:59.999Z');
    });

    it('usa la zona configurada en la organizacion', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        timezone: 'America/Tijuana',
      });

      await service.findAll({ date: '2026-08-27', organizationId: 'org1' });

      // Tijuana en agosto va una hora por detras de Ciudad de Mexico.
      expect(whereUsado().orderedAt.gte.toISOString()).toBe(
        '2026-08-27T07:00:00.000Z',
      );
    });

    it('incluye la venta de la tarde, que es la que se perdia', async () => {
      // Seis tickets cobrados entre las 18:11 y las 19:25 del 26 de agosto
      // estan guardados como 27 de agosto en UTC. Con el dia recortado en UTC
      // desaparecian de su propia jornada.
      await service.findAll({ date: '2026-08-26', organizationId: 'org1' });

      const { gte, lte } = whereUsado().orderedAt;
      const ventaDeLaTarde = new Date('2026-08-27T01:25:00.000Z');

      expect(ventaDeLaTarde >= gte && ventaDeLaTarde <= lte).toBe(true);
    });

    it('no arrastra la madrugada del dia siguiente', async () => {
      await service.findAll({ date: '2026-08-26', organizationId: 'org1' });

      const { lte } = whereUsado().orderedAt;
      const yaEsDia27 = new Date('2026-08-27T12:00:00.000Z'); // 06:00 CDMX

      expect(yaEsDia27 <= lte).toBe(false);
    });

    it('ignora una fecha con formato invalido en vez de filtrar por basura', async () => {
      await service.findAll({ date: 'ayer' });

      expect(whereUsado().orderedAt).toBeUndefined();
    });

    it('no filtra por fecha si no se pide', async () => {
      await service.findAll({});

      expect(whereUsado().orderedAt).toBeUndefined();
    });

    it('no consulta la zona si no hay filtro de fecha', async () => {
      // La busqueda de la zona es una consulta mas: solo se paga cuando hace
      // falta recortar un dia.
      await service.findAll({ organizationId: 'org1' });

      expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('resto de filtros', () => {
    it('acota por organizacion a traves de la sucursal', async () => {
      // Order no tiene organizationId propio: la pertenencia se resuelve por
      // la relacion `location`.
      await service.findAll({ organizationId: 'org1' });

      expect(whereUsado().location).toEqual({ organizationId: 'org1' });
    });

    it('rechaza un estado que no existe en el enum', async () => {
      await expect(service.findAll({ status: 'INVENTADO' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('acepta un estado valido', async () => {
      await service.findAll({ status: 'READY' });

      expect(whereUsado().status).toBe('READY');
    });
  });

  describe('maquina de estados', () => {
    it('rechaza un salto que no esta permitido', async () => {
      // PENDING solo puede ir a IN_PROGRESS o CANCELLED. Saltar directo a
      // SERVED se saltaria la preparacion.
      prisma.order.findFirst.mockResolvedValue({
        id: 'o1',
        status: 'PENDING',
        locationId: 'loc1',
      });

      await expect(
        service.updateStatus('o1', { status: 'SERVED' } as never, 'org1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('permite el salto siguiente y sella la marca de tiempo', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: 'o1',
        status: 'READY',
        locationId: 'loc1',
      });
      prisma.order.update.mockResolvedValue({ id: 'o1', status: 'SERVED' });
      inventoryAutomation.autoDeductOnSale.mockResolvedValue({
        status: 'skipped',
        reason: 'ya descontado',
      });

      await service.updateStatus('o1', { status: 'SERVED' } as never, 'org1');

      const data = prisma.order.update.mock.calls[0][0].data;
      expect(data.status).toBe('SERVED');
      expect(data.servedAt).toBeInstanceOf(Date);
    });
  });
});
