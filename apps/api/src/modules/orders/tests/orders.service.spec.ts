import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { PrismaService } from '../../database/prisma.service';
import { InventoryAutomationService } from '../../inventory/inventory-automation.service';

/**
 * `OrdersService` no tenia ningun test propio, y por ahi se colo el filtro de
 * fecha: `new Date('2026-08-27')` se parsea como medianoche UTC pero
 * `setHours` opera en hora local, asi que en cualquier zona detras de UTC el
 * rango salia desplazado un dia entero. La pantalla de ordenes llevaba
 * enseniando las de ayer.
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
    $transaction: jest.fn(),
  };

  const inventoryAutomation = { autoDeductOnSale: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockResolvedValue([[], 0]);

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
    it('cubre el dia de calendario completo, de 00:00 a 23:59', async () => {
      await service.findAll({ date: '2026-08-27' });

      const { gte, lte } = whereUsado().orderedAt;

      // Se comparan los componentes locales, no el instante: el test tiene que
      // pasar en la zona que sea, que es justamente lo que el bug ignoraba.
      expect(gte.getFullYear()).toBe(2026);
      expect(gte.getMonth()).toBe(7); // agosto
      expect(gte.getDate()).toBe(27);
      expect(gte.getHours()).toBe(0);
      expect(gte.getMinutes()).toBe(0);

      expect(lte.getDate()).toBe(27);
      expect(lte.getHours()).toBe(23);
      expect(lte.getMinutes()).toBe(59);
    });

    it('incluye una orden de media tarde, no solo la madrugada', async () => {
      // El sintoma concreto: con el rango desplazado, una venta de las 09:25 de
      // la maniana caia fuera y solo aparecian las de la madrugada.
      await service.findAll({ date: '2026-08-27' });

      const { gte, lte } = whereUsado().orderedAt;
      const mediaTarde = new Date(2026, 7, 27, 15, 30, 0);

      expect(mediaTarde >= gte && mediaTarde <= lte).toBe(true);
    });

    it('no mete el dia anterior en el rango', async () => {
      await service.findAll({ date: '2026-08-27' });

      const { gte } = whereUsado().orderedAt;
      const ayerPorLaNoche = new Date(2026, 7, 26, 23, 30, 0);

      expect(ayerPorLaNoche >= gte).toBe(false);
    });

    it('ignora una fecha con formato invalido en vez de filtrar por basura', async () => {
      await service.findAll({ date: 'ayer' });

      expect(whereUsado().orderedAt).toBeUndefined();
    });

    it('no filtra por fecha si no se pide', async () => {
      await service.findAll({});

      expect(whereUsado().orderedAt).toBeUndefined();
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
