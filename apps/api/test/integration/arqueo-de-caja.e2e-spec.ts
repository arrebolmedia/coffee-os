import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/database/prisma.service';

/**
 * El arqueo de caja: contar el cajón al cerrar y ver si cuadra.
 *
 * `expectedCash` se fijaba al abrir con el fondo inicial y no se movía nunca,
 * así que el arqueo comparaba el conteo final contra el fondo. Medido contra la
 * API antes de arreglarlo: abrir con $1,000, vender $348 en efectivo y contar
 * $1,348 —un día perfectamente honesto— se reportaba como **una diferencia de
 * +$348**.
 *
 * Lo peligroso no es el falso positivo sino lo contrario: con el faltante
 * escondido dentro de un «sobrante» permanente, un robo no se distingue de un
 * día normal. Por eso los casos de abajo prueban las tres situaciones: cuadra,
 * falta y sobra.
 */
describe('Arqueo de caja (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const password = 'Arqueo123!';
  const ctx: {
    organizationId?: string;
    locationId?: string;
    userId?: string;
    categoryId?: string;
    productId?: string;
    roleId?: string;
    ticketIds: string[];
    registerIds: string[];
    shiftIds: string[];
  } = { ticketIds: [], registerIds: [], shiftIds: [] };

  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = app.get(PrismaService);

    await montar();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `arqueo.${ctx.organizationId}@coffeeos.test`, password })
      .expect(200);
    token = login.body.accessToken;
  }, 60000);

  afterAll(async () => {
    await limpiar();
    await app.close();
  });

  /** Abre una caja con su fondo y devuelve su id. */
  async function abrirCaja(fondo: number) {
    const res = await request(app.getHttpServer())
      .post('/api/v1/pos/cash-register/open')
      .set('Authorization', `Bearer ${token}`)
      .send({
        organization_id: ctx.organizationId,
        initial_amount: fondo,
        user_id: ctx.userId,
        location_id: ctx.locationId,
      })
      .expect(201);
    ctx.registerIds.push(res.body.id);
    return res.body.id as string;
  }

  /** Cobra una venta en el método indicado. */
  async function vender(metodo: 'CASH' | 'CARD', importe: number) {
    const creado = await request(app.getHttpServer())
      .post('/api/v1/pos/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        locationId: ctx.locationId,
        userId: ctx.userId,
        lines: [{ productId: ctx.productId, quantity: 1, unitPrice: importe }],
      })
      .expect(201);
    ctx.ticketIds.push(creado.body.id);

    const cerrado = await request(app.getHttpServer())
      .patch(`/api/v1/pos/tickets/${creado.body.id}/close`)
      .set('Authorization', `Bearer ${token}`)
      .send({ payments: [{ method: metodo, amount: creado.body.total }] })
      .expect(200);
    return cerrado.body.total as number;
  }

  function cerrarCaja(id: string, contado: number) {
    return request(app.getHttpServer())
      .post(`/api/v1/pos/cash-register/${id}/close`)
      .set('Authorization', `Bearer ${token}`)
      .send({ final_amount: contado })
      .expect(201);
  }

  it('un día honesto no reporta ninguna diferencia', async () => {
    const caja = await abrirCaja(1000);
    const a = await vender('CASH', 100);
    const b = await vender('CASH', 50);

    const enCajon = 1000 + a + b;
    const res = await cerrarCaja(caja, enCajon);

    expect(res.body.difference).toBe(0);
    expect(res.body.opening_float).toBe(1000);
    expect(res.body.cash_sales).toBeCloseTo(a + b, 2);
    expect(res.body.expected_cash).toBeCloseTo(enCajon, 2);
  });

  it('un faltante se ve como faltante', async () => {
    const caja = await abrirCaja(500);
    const venta = await vender('CASH', 100);

    // El cajero se quedó con $200.
    const res = await cerrarCaja(caja, 500 + venta - 200);

    expect(res.body.difference).toBeCloseTo(-200, 2);
  });

  it('un sobrante también', async () => {
    const caja = await abrirCaja(500);
    const venta = await vender('CASH', 100);

    const res = await cerrarCaja(caja, 500 + venta + 35);

    expect(res.body.difference).toBeCloseTo(35, 2);
  });

  it('lo cobrado con tarjeta no cuenta como efectivo en el cajón', async () => {
    // Es la mitad del arqueo: si las tarjetas sumaran, el cajón siempre saldría
    // corto por el importe de lo cobrado con plástico.
    const caja = await abrirCaja(300);
    await vender('CARD', 250);
    const efectivo = await vender('CASH', 40);

    const res = await cerrarCaja(caja, 300 + efectivo);

    expect(res.body.cash_sales).toBeCloseTo(efectivo, 2);
    expect(res.body.difference).toBe(0);
  });

  it('la caja abierta dice cuánto debería haber, sin tener que cerrarla', async () => {
    // Sin esto el cajero cuenta a ciegas: sólo sabía el fondo con el que abrió.
    const caja = await abrirCaja(700);
    const venta = await vender('CASH', 100);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/pos/cash-register/current/${ctx.organizationId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.opening_float).toBe(700);
    expect(res.body.cash_sales).toBeCloseTo(venta, 2);
    expect(res.body.expected_cash).toBeCloseTo(700 + venta, 2);

    await cerrarCaja(caja, 700 + venta);
  });

  async function montar() {
    const sufijo = Date.now().toString();

    const org = await prisma.organization.create({
      data: { name: `Arqueo ${sufijo}`, slug: `arqueo-${sufijo}` },
    });
    ctx.organizationId = org.id;

    const role = await prisma.role.create({
      data: { name: `ARQ_${sufijo}`, code: `arq_${sufijo}`, scopes: ['*'] },
    });
    ctx.roleId = role.id;

    const location = await prisma.location.create({
      data: {
        organizationId: org.id,
        name: 'Arqueo Location',
        city: 'CDMX',
        active: true,
      },
    });
    ctx.locationId = location.id;

    const user = await prisma.user.create({
      data: {
        email: `arqueo.${org.id}@coffeeos.test`,
        password: await bcrypt.hash(password, 10),
        firstName: 'Arqueo',
        lastName: 'User',
        organizationId: org.id,
        roleId: role.id,
        active: true,
      },
    });
    ctx.userId = user.id;

    const categoria = await prisma.category.create({
      data: { organizationId: org.id, name: `Arqueo ${sufijo}`, sortOrder: 0 },
    });
    ctx.categoryId = categoria.id;

    const producto = await prisma.product.create({
      data: {
        organizationId: org.id,
        categoryId: categoria.id,
        sku: `ARQ-${sufijo}`,
        name: 'Producto de arqueo',
        price: 100,
        taxRate: 0,
        tags: [],
      },
    });
    ctx.productId = producto.id;
  }

  async function limpiar() {
    if (!ctx.organizationId) return;

    if (ctx.ticketIds.length) {
      const ordenes = await prisma.order.findMany({
        where: { ticketId: { in: ctx.ticketIds } },
        select: { id: true },
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: ordenes.map((o) => o.id) } },
      });
      await prisma.order.deleteMany({
        where: { ticketId: { in: ctx.ticketIds } },
      });
      await prisma.payment.deleteMany({
        where: { ticketId: { in: ctx.ticketIds } },
      });
      await prisma.ticketLine.deleteMany({
        where: { ticketId: { in: ctx.ticketIds } },
      });
      await prisma.ticket.deleteMany({ where: { id: { in: ctx.ticketIds } } });
    }

    await prisma.cashRegister.deleteMany({
      where: { organizationId: ctx.organizationId },
    });
    await prisma.shift.deleteMany({ where: { locationId: ctx.locationId } });
    await prisma.product.deleteMany({ where: { id: ctx.productId } });
    await prisma.category.deleteMany({ where: { id: ctx.categoryId } });
    await prisma.user.deleteMany({ where: { id: ctx.userId } });
    await prisma.location.deleteMany({ where: { id: ctx.locationId } });
    await prisma.role.deleteMany({ where: { id: ctx.roleId } });
    await prisma.organization.deleteMany({
      where: { id: ctx.organizationId },
    });
  }
});
