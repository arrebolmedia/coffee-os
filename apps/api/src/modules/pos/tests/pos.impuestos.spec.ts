import { Test, TestingModule } from '@nestjs/testing';
import { PosService } from '../pos.service';
import { PrismaService } from '../../database/prisma.service';
import { InventoryAutomationService } from '../../inventory/inventory-automation.service';

/**
 * El IVA de un ticket, producto a producto.
 *
 * Dos cosas que no estaban cubiertas y se pagan en cada venta:
 *
 * - La tasa 0. El pan para llevar tributa a tasa 0 por el artículo 2-A de la
 *   LIVA, igual que la leche o la fruta sin preparar. Hasta ahora era imposible
 *   siquiera dar de alta un producto así (`tax_rate || 0.16` convertía el 0 en
 *   16 %), de modo que el cálculo nunca había visto una tasa 0.
 *
 * - El precio con el IVA dentro. La columna existía, el DTO lo aceptaba y el
 *   cálculo no lo miraba: el impuesto se sumaba por encima de un precio que ya
 *   lo llevaba.
 */
describe('PosService — IVA por producto', () => {
  let service: PosService;

  const tx = {
    customer: { findUnique: jest.fn(), updateMany: jest.fn() },
    ticket: { create: jest.fn() },
    loyaltyTransaction: { create: jest.fn() },
    product: { findUnique: jest.fn() },
    order: { create: jest.fn() },
  };

  const prisma = {
    product: { findUnique: jest.fn() },
    ticket: { findFirst: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(tx)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));
    prisma.ticket.findFirst.mockResolvedValue({ id: 'tk1' });
    // `lines` va DESPUES del spread: en `data` es un `create` anidado de
    // Prisma, y la orden de cocina que se crea a continuacion espera recorrer
    // una lista de lineas ya materializadas.
    tx.ticket.create.mockImplementation(async ({ data }: any) => ({
      id: 'tk1',
      locationId: 'loc1',
      userId: 'u1',
      ...data,
      lines: [],
    }));
    tx.product.findUnique.mockResolvedValue({ preparationTimeMinutes: 0 });
    tx.order.create.mockResolvedValue({ orderNumber: 'ORD-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: InventoryAutomationService,
          useValue: { autoDeductOnSale: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get(PosService);
  });

  /** Régimen fiscal que devolverá la consulta de cada producto. */
  function conProductos(porId: Record<string, [number, boolean]>) {
    prisma.product.findUnique.mockImplementation(async ({ where }: any) => {
      const [taxRate, taxIncluded] = porId[where.id] ?? [0.16, false];
      return { taxRate, taxIncluded };
    });
  }

  /** Los totales con los que se creó el ticket. */
  function totales() {
    const d = tx.ticket.create.mock.calls[0][0].data;
    return { subtotal: d.subtotal, tax: d.tax, total: d.total };
  }

  const venta = (lines: any[], discount?: number) =>
    service.createTicket({
      locationId: 'loc1',
      userId: 'u1',
      lines,
      ...(discount !== undefined ? { discount } : {}),
    });

  describe('IVA por fuera, que es el caso de siempre', () => {
    it('un café de $100 al 16 % cobra $116', async () => {
      conProductos({ cafe: [0.16, false] });

      await venta([{ productId: 'cafe', quantity: 1, unitPrice: 100 }]);

      expect(totales()).toEqual({ subtotal: 100, tax: 16, total: 116 });
    });
  });

  describe('tasa 0 — el pan para llevar', () => {
    it('no cobra IVA y el total es el precio', async () => {
      conProductos({ pan: [0, false] });

      await venta([{ productId: 'pan', quantity: 2, unitPrice: 25 }]);

      expect(totales()).toEqual({ subtotal: 50, tax: 0, total: 50 });
    });

    it('convive con un producto al 16 % en el mismo ticket', async () => {
      // Una concha para llevar y un café: el IVA sale sólo del café. Es el caso
      // normal de una cafetería con panadería, y el que obliga a que la tasa
      // sea del producto y no del ticket.
      conProductos({ pan: [0, false], cafe: [0.16, false] });

      await venta([
        { productId: 'pan', quantity: 1, unitPrice: 25 },
        { productId: 'cafe', quantity: 1, unitPrice: 50 },
      ]);

      expect(totales()).toEqual({ subtotal: 75, tax: 8, total: 83 });
    });
  });

  describe('precio con el IVA dentro', () => {
    it('extrae el impuesto en vez de sumarlo: $116 en la carta son $116 a pagar', async () => {
      conProductos({ pan: [0.16, true] });

      await venta([{ productId: 'pan', quantity: 1, unitPrice: 116 }]);

      expect(totales()).toEqual({ subtotal: 100, tax: 16, total: 116 });
    });

    it('a tasa 0 el precio es la base entera', async () => {
      conProductos({ pan: [0, true] });

      await venta([{ productId: 'pan', quantity: 1, unitPrice: 40 }]);

      expect(totales()).toEqual({ subtotal: 40, tax: 0, total: 40 });
    });

    it('mezclado con uno de IVA por fuera, cada uno con su criterio', async () => {
      conProductos({ dentro: [0.16, true], fuera: [0.16, false] });

      await venta([
        { productId: 'dentro', quantity: 1, unitPrice: 116 },
        { productId: 'fuera', quantity: 1, unitPrice: 100 },
      ]);

      // 100 de base + 100 de base = 200; 16 + 16 = 32; 116 + 116 = 232.
      expect(totales()).toEqual({ subtotal: 200, tax: 32, total: 232 });
    });
  });

  describe('con descuento', () => {
    it('el descuento reduce la base gravable, no sólo el total', async () => {
      conProductos({ cafe: [0.16, false] });

      await venta([{ productId: 'cafe', quantity: 1, unitPrice: 100 }], 20);

      // Base 80 → IVA 12.80 → total 92.80.
      expect(totales()).toEqual({ subtotal: 100, tax: 12.8, total: 92.8 });
    });

    it('no cobra IVA sobre un producto a tasa 0 aunque lleve descuento', async () => {
      conProductos({ pan: [0, false] });

      await venta([{ productId: 'pan', quantity: 1, unitPrice: 100 }], 20);

      expect(totales()).toEqual({ subtotal: 100, tax: 0, total: 80 });
    });
  });

  describe('producto que ya no existe', () => {
    it('cae al 16 % por fuera, que es el régimen por defecto', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await venta([{ productId: 'fantasma', quantity: 1, unitPrice: 100 }]);

      expect(totales()).toEqual({ subtotal: 100, tax: 16, total: 116 });
    });
  });
});
