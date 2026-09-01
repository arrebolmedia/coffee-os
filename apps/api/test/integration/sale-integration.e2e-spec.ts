import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/database/prisma.service';

describe('POS Sale Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testPassword = 'PosIntegration123!';

  const testContext: {
    organizationId?: string;
    roleId?: string;
    userId?: string;
    userEmail?: string;
    locationId?: string;
    categoryId?: string;
    productId?: string;
    ticketId?: string;
    orderId?: string;
    productPrice?: number;
  } = {};

  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);

    await setupTestData();
    await authenticateTestUser();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  describe('Ticket creation', () => {
    it('creates a ticket and associated kitchen order', async () => {
      const saleRequest = {
        locationId: testContext.locationId,
        userId: testContext.userId,
        lines: [
          {
            productId: testContext.productId,
            quantity: 2,
            unitPrice: testContext.productPrice,
          },
        ],
        notes: 'Integration POS sale',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/pos/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(saleRequest)
        .expect(201);

      const ticket = response.body;

      expect(ticket).toHaveProperty('id');
      expect(ticket).toHaveProperty('ticketNumber');
      expect(ticket.lines).toHaveLength(1);
      expect(ticket.lines[0].productId).toBe(testContext.productId);

      // El producto se crea aqui con Prisma SIN decir nada del IVA, asi que
      // hereda el default. Y el default es que el precio de carta ya lo lleva
      // dentro: dos cafes de $48 se cobran $96, no $111.36.
      //
      // Esta afirmacion es ademas el detector de un cliente de Prisma viejo.
      // Cuando se cambio el default no se corrio `prisma generate`, asi que el
      // cliente seguia inyectando `tax_included: false` en cada INSERT y pisaba
      // el default de la base. Las 1349 pruebas pasaban y esta lo documentaba
      // al reves, afirmando el modelo viejo. Si vuelve a desalinearse, cae aqui.
      const precioDeCarta = 2 * (testContext.productPrice ?? 0);
      const expectedTax = precioDeCarta - precioDeCarta / 1.16;

      expect(ticket.total).toBeCloseTo(precioDeCarta, 2);
      expect(ticket.tax).toBeCloseTo(expectedTax, 2);
      expect(ticket.subtotal).toBeCloseTo(precioDeCarta - expectedTax, 2);

      testContext.ticketId = ticket.id;

      const orders = await prisma.order.findMany({
        where: { ticketId: ticket.id },
        include: { items: true },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].items).toHaveLength(1);
      expect(orders[0].items[0].productId).toBe(testContext.productId);
      expect(orders[0].status).toBe('PENDING');

      testContext.orderId = orders[0].id;
    });
  });

  describe('Order visibility', () => {
    it('lists kitchen orders for a location', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/pos/orders?locationId=${testContext.locationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(
        response.body.some((order: any) => order.id === testContext.orderId),
      ).toBe(true);
    });

    it('allows status transitions for orders', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/pos/orders/${testContext.orderId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      const inProgress = await prisma.order.findUnique({
        where: { id: testContext.orderId },
      });

      expect(inProgress?.status).toBe('IN_PROGRESS');

      await request(app.getHttpServer())
        .post(`/api/v1/pos/orders/${testContext.orderId}/ready`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      const ready = await prisma.order.findUnique({
        where: { id: testContext.orderId },
      });

      expect(ready?.status).toBe('READY');

      await request(app.getHttpServer())
        .post(`/api/v1/pos/orders/${testContext.orderId}/served`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      const served = await prisma.order.findUnique({
        where: { id: testContext.orderId },
      });

      expect(served?.status).toBe('SERVED');
    });
  });

  describe('El comprobante del cliente', () => {
    it('sale con el numero de ticket, las lineas y el total', async () => {
      // Pedido por el id del TICKET, que es lo que tiene el POS recien cobrado.
      const res = await request(app.getHttpServer())
        .get(`/api/v1/pos/orders/${testContext.ticketId}/receipt`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const recibo: string = res.body.receipt;
      const precioDeCarta = 2 * (testContext.productPrice ?? 0);

      expect(recibo).toContain('Integration Cappuccino');
      expect(recibo).toContain('$96.00');
      expect(recibo).toContain('TOTAL');
      expect(precioDeCarta).toBe(96);
      // Y no el recibo en blanco de antes.
      expect(recibo).not.toContain('Ticket: </');
    });

    it('tambien se puede pedir por el id de la orden de cocina', async () => {
      // La pantalla de comandas tiene la orden, no el ticket. Con este id el
      // endpoint buscaba un ticket, no encontraba nada, y devolvia HTTP 200 con
      // un recibo vacio: ni numero, ni lineas, ni total.
      const res = await request(app.getHttpServer())
        .get(`/api/v1/pos/orders/${testContext.orderId}/receipt`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.receipt).toContain('Integration Cappuccino');
      expect(res.body.receipt).toContain('$96.00');
    });

    it('un id que no existe da 404, no un recibo vacio', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/pos/orders/ckinexistente000000000000/receipt')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  async function setupTestData() {
    const suffix = Date.now().toString();

    const organization = await prisma.organization.create({
      data: {
        name: `POS Integration Org ${suffix}`,
        slug: `pos-integration-${suffix}`,
      },
    });

    const role = await prisma.role.create({
      data: {
        name: `POS_ROLE_${suffix}`,
        // `code` es obligatorio desde la migración de roles a Prisma; es único
        // por organización, de ahí el sufijo.
        code: `pos_role_${suffix}`,
        description: 'Role for POS integration tests',
        scopes: ['pos:*'],
      },
    });

    const location = await prisma.location.create({
      data: {
        organizationId: organization.id,
        name: 'POS Integration Location',
        address: 'Integration Ave 123',
        city: 'CDMX',
        state: 'CDMX',
        postalCode: '06000',
        phone: '5555555555',
        email: `location.${suffix}@coffeeos.test`,
        active: true,
      },
    });

    const hashedPassword = await bcrypt.hash(testPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: `pos.user.${suffix}@coffeeos.test`,
        password: hashedPassword,
        firstName: 'POS',
        lastName: 'User',
        organizationId: organization.id,
        roleId: role.id,
        active: true,
      },
    });

    await prisma.userLocation.create({
      data: {
        userId: user.id,
        locationId: location.id,
      },
    });

    const category = await prisma.category.create({
      data: {
        organizationId: organization.id,
        name: `POS Drinks ${suffix}`,
        sortOrder: 0,
      },
    });

    const product = await prisma.product.create({
      data: {
        organizationId: organization.id,
        categoryId: category.id,
        sku: `POS-SKU-${suffix}`,
        name: 'Integration Cappuccino',
        description: 'Product used for POS integration tests',
        price: 48,
        cost: 18,
        tags: [],
        allowModifiers: true,
        active: true,
      },
    });

    testContext.organizationId = organization.id;
    testContext.roleId = role.id;
    testContext.locationId = location.id;
    testContext.userId = user.id;
    testContext.userEmail = user.email;
    testContext.categoryId = category.id;
    testContext.productId = product.id;
    testContext.productPrice = product.price;
  }

  async function authenticateTestUser() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testContext.userEmail,
        password: testPassword,
      })
      .expect(200);

    authToken = response.body.accessToken;
  }

  async function cleanupTestData() {
    if (!testContext.organizationId) {
      return;
    }

    if (testContext.orderId) {
      await prisma.orderItem.deleteMany({
        where: { orderId: testContext.orderId },
      });
      await prisma.order.deleteMany({
        where: { id: testContext.orderId },
      });
    }

    if (testContext.ticketId) {
      await prisma.ticketLineModifier.deleteMany({
        where: { ticketLine: { ticketId: testContext.ticketId } },
      });
      await prisma.ticketLine.deleteMany({
        where: { ticketId: testContext.ticketId },
      });
      await prisma.ticket.deleteMany({
        where: { id: testContext.ticketId },
      });
    }

    await prisma.product.deleteMany({
      where: { id: testContext.productId },
    });

    await prisma.category.deleteMany({
      where: { id: testContext.categoryId },
    });

    await prisma.userLocation.deleteMany({
      where: {
        userId: testContext.userId,
        locationId: testContext.locationId,
      },
    });

    await prisma.user.deleteMany({
      where: { id: testContext.userId },
    });

    await prisma.location.deleteMany({
      where: { id: testContext.locationId },
    });

    await prisma.role.deleteMany({
      where: { id: testContext.roleId },
    });

    await prisma.organization.deleteMany({
      where: { id: testContext.organizationId },
    });
  }
});
