import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/database/prisma.service';

/**
 * Idempotencia del reenvío de ventas offline, contra Postgres real.
 *
 * La cola de sincronización reintenta lo que falló, y no puede distinguir «no
 * se creó» de «se creó y no me enteré» cuando la red cae después de que el
 * servidor respondiera. Sin esto, cada reintento cobraba la venta otra vez.
 *
 * Lo que se prueba aquí no es el código del cliente sino la garantía del
 * servidor, que es la única que sobrevive a un cliente con bugs.
 */
describe('Ticket idempotency (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testPassword = 'Idempotency123!';
  const ctx: {
    organizationId?: string;
    roleId?: string;
    userId?: string;
    userEmail?: string;
    locationId?: string;
    categoryId?: string;
    productId?: string;
    ticketIds: string[];
  } = { ticketIds: [] };

  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = app.get(PrismaService);

    await setup();

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ctx.userEmail, password: testPassword })
      .expect(200);
    token = res.body.accessToken;
  }, 60000);

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  function venta(clientRequestId?: string) {
    return request(app.getHttpServer())
      .post('/api/v1/pos/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...(clientRequestId ? { clientRequestId } : {}),
        locationId: ctx.locationId,
        userId: ctx.userId,
        lines: [{ productId: ctx.productId, quantity: 1, unitPrice: 50 }],
      });
  }

  it('un reenvío con la misma clave devuelve el ticket original, no uno nuevo', async () => {
    const clave = `req-${Date.now()}`;

    const primera = await venta(clave).expect(201);
    const segunda = await venta(clave).expect(201);
    ctx.ticketIds.push(primera.body.id);

    expect(segunda.body.id).toBe(primera.body.id);
    expect(segunda.body.ticketNumber).toBe(primera.body.ticketNumber);

    const enBase = await prisma.ticket.count({
      where: { clientRequestId: clave },
    });
    expect(enBase).toBe(1);
  });

  it('dos reenvíos SIMULTÁNEOS tampoco crean dos ventas', async () => {
    // El chequeo previo del servicio es check-then-act: dos peticiones lo pasan
    // las dos. Quien garantiza que no haya duplicado es el índice único de la
    // base, y esto es lo que lo comprueba.
    const clave = `req-carrera-${Date.now()}`;

    const [a, b] = await Promise.all([venta(clave), venta(clave)]);

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.id).toBe(b.body.id);
    ctx.ticketIds.push(a.body.id);

    const enBase = await prisma.ticket.count({
      where: { clientRequestId: clave },
    });
    expect(enBase).toBe(1);
  });

  it('sin clave, cada llamada crea su propia venta', async () => {
    // La idempotencia es opt-in: una venta online normal no manda clave y dos
    // cafés seguidos al mismo cliente tienen que ser dos tickets.
    const primera = await venta().expect(201);
    const segunda = await venta().expect(201);
    ctx.ticketIds.push(primera.body.id, segunda.body.id);

    expect(segunda.body.id).not.toBe(primera.body.id);
  });

  async function setup() {
    const suffix = Date.now().toString();
    const org = await prisma.organization.create({
      data: { name: `Idem Org ${suffix}`, slug: `idem-${suffix}` },
    });
    ctx.organizationId = org.id;

    const role = await prisma.role.create({
      data: {
        name: `IDEM_${suffix}`,
        code: `idem_${suffix}`,
        scopes: ['pos:*'],
      },
    });
    ctx.roleId = role.id;

    const location = await prisma.location.create({
      data: {
        organizationId: org.id,
        name: 'Idem Location',
        address: 'Idem 1',
        city: 'CDMX',
        state: 'CDMX',
        postalCode: '06000',
        phone: '5555555555',
        email: `idem.loc.${suffix}@coffeeos.test`,
        active: true,
      },
    });
    ctx.locationId = location.id;

    const user = await prisma.user.create({
      data: {
        email: `idem.user.${suffix}@coffeeos.test`,
        password: await bcrypt.hash(testPassword, 10),
        firstName: 'Idem',
        lastName: 'User',
        organizationId: org.id,
        roleId: role.id,
        active: true,
      },
    });
    ctx.userId = user.id;
    ctx.userEmail = user.email;

    await prisma.userLocation.create({
      data: { userId: user.id, locationId: location.id },
    });

    const category = await prisma.category.create({
      data: {
        organizationId: org.id,
        name: `Idem Cat ${suffix}`,
        sortOrder: 0,
      },
    });
    ctx.categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        organizationId: org.id,
        categoryId: category.id,
        sku: `IDEM-${suffix}`,
        name: 'Producto idempotente',
        price: 50,
        tags: [],
      },
    });
    ctx.productId = product.id;
  }

  async function cleanup() {
    if (!ctx.organizationId) return;

    const tickets = await prisma.ticket.findMany({
      where: { locationId: ctx.locationId },
      select: { id: true },
    });
    const ids = tickets.map((t) => t.id);

    if (ids.length) {
      const orders = await prisma.order.findMany({
        where: { ticketId: { in: ids } },
        select: { id: true },
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: orders.map((o) => o.id) } },
      });
      await prisma.order.deleteMany({ where: { ticketId: { in: ids } } });
      await prisma.payment.deleteMany({ where: { ticketId: { in: ids } } });
      await prisma.ticketLineModifier.deleteMany({
        where: { ticketLine: { ticketId: { in: ids } } },
      });
      await prisma.ticketLine.deleteMany({ where: { ticketId: { in: ids } } });
      await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
    }

    await prisma.product.deleteMany({ where: { id: ctx.productId } });
    await prisma.category.deleteMany({ where: { id: ctx.categoryId } });
    await prisma.userLocation.deleteMany({ where: { userId: ctx.userId } });
    await prisma.user.deleteMany({ where: { id: ctx.userId } });
    await prisma.location.deleteMany({ where: { id: ctx.locationId } });
    await prisma.role.deleteMany({ where: { id: ctx.roleId } });
    await prisma.organization.deleteMany({ where: { id: ctx.organizationId } });
  }
});
