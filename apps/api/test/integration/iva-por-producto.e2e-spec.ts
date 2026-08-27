import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/database/prisma.service';

/**
 * El IVA de punta a punta: dar de alta el producto por la API y cobrarlo.
 *
 * Los unitarios comprueban el cálculo con la tasa ya puesta. Esto comprueba lo
 * que fallaba de verdad: que la tasa que se pide al crear el producto sea la
 * que acaba cobrando el POS.
 *
 * Medido contra la API antes de arreglarlo:
 *   - pedir `tax_rate: 0`      → se guardaba 0.16 (la tasa cero era imposible)
 *   - pedir `tax_rate: 16`     → se guardaba 16, y un producto de $50 cobraba
 *                                $800 de IVA y $850 de total
 *   - pedir `tax_included`     → se guardaba false, siempre
 *
 * El `ValidationPipe` se monta igual que en `main.ts` porque uno de los casos
 * es justamente que la validación rechace el 16.
 */
describe('IVA por producto (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const password = 'Iva123!';
  const ctx: {
    organizationId?: string;
    locationId?: string;
    userId?: string;
    categoryId?: string;
    roleId?: string;
    productIds: string[];
    ticketIds: string[];
  } = { productIds: [], ticketIds: [] };

  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    await montar();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `iva.${ctx.organizationId}@coffeeos.test`, password })
      .expect(200);
    token = login.body.accessToken;
  }, 60000);

  afterAll(async () => {
    await limpiar();
    await app.close();
  });

  /** Da de alta un producto y devuelve la respuesta cruda. */
  function crearProducto(cuerpo: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        organization_id: ctx.organizationId,
        category_id: ctx.categoryId,
        ...cuerpo,
      });
  }

  /** Cobra una unidad del producto y devuelve los totales del ticket. */
  async function vender(productId: string, unitPrice: number) {
    const res = await request(app.getHttpServer())
      .post('/api/v1/pos/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        locationId: ctx.locationId,
        userId: ctx.userId,
        lines: [{ productId, quantity: 1, unitPrice }],
      })
      .expect(201);

    ctx.ticketIds.push(res.body.id);
    return {
      subtotal: res.body.subtotal,
      tax: res.body.tax,
      total: res.body.total,
    };
  }

  describe('tasa 0 — el pan para llevar', () => {
    it('se puede dar de alta a tasa 0 y se guarda como tasa 0', async () => {
      const res = await crearProducto({
        name: 'Concha para llevar',
        sku: `PAN-0-${Date.now()}`,
        base_price: 25,
        tax_rate: 0,
      }).expect(201);

      ctx.productIds.push(res.body.id);
      expect(res.body.taxRate).toBe(0);
    });

    it('y al cobrarlo no lleva IVA', async () => {
      const totales = await vender(ctx.productIds[0], 25);

      expect(totales).toEqual({ subtotal: 25, tax: 0, total: 25 });
    });
  });

  describe('la tasa es una fracción, no un porcentaje', () => {
    it('rechaza un 16 en vez de guardarlo como 1600 %', async () => {
      const res = await crearProducto({
        name: 'Producto con tasa mal escrita',
        sku: `MAL-${Date.now()}`,
        base_price: 50,
        tax_rate: 16,
      }).expect(400);

      expect(JSON.stringify(res.body.message)).toMatch(/fracción|fraccion/i);
    });

    it('acepta 0.16, que es como se escribe el 16 %', async () => {
      const res = await crearProducto({
        name: 'Café al 16',
        sku: `CAF-16-${Date.now()}`,
        base_price: 50,
        tax_rate: 0.16,
      }).expect(201);

      ctx.productIds.push(res.body.id);
      expect(res.body.taxRate).toBe(0.16);
    });

    it('y cobra $58 por un café de $50, no $850', async () => {
      const totales = await vender(ctx.productIds[1], 50);

      expect(totales).toEqual({ subtotal: 50, tax: 8, total: 58 });
    });
  });

  describe('precio con el IVA dentro', () => {
    it('guarda la marca en vez de descartarla', async () => {
      const res = await crearProducto({
        name: 'Café con IVA incluido',
        sku: `INC-${Date.now()}`,
        base_price: 116,
        tax_rate: 0.16,
        tax_included: true,
      }).expect(201);

      ctx.productIds.push(res.body.id);
      expect(res.body.taxIncluded).toBe(true);
    });

    it('y al cobrarlo extrae el impuesto: $116 en la carta son $116 a pagar', async () => {
      const totales = await vender(ctx.productIds[2], 116);

      expect(totales).toEqual({ subtotal: 100, tax: 16, total: 116 });
    });
  });

  describe('varias tasas en el mismo ticket', () => {
    it('cada línea con la suya', async () => {
      // Una concha a tasa 0 y un café al 16 %: el caso de cualquier cafetería
      // con panadería, y el que obliga a que la tasa sea del producto.
      const res = await request(app.getHttpServer())
        .post('/api/v1/pos/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          locationId: ctx.locationId,
          userId: ctx.userId,
          lines: [
            { productId: ctx.productIds[0], quantity: 1, unitPrice: 25 },
            { productId: ctx.productIds[1], quantity: 1, unitPrice: 50 },
          ],
        })
        .expect(201);

      ctx.ticketIds.push(res.body.id);
      expect({
        subtotal: res.body.subtotal,
        tax: res.body.tax,
        total: res.body.total,
      }).toEqual({ subtotal: 75, tax: 8, total: 83 });
    });
  });

  async function montar() {
    const sufijo = Date.now().toString();

    const org = await prisma.organization.create({
      data: { name: `IVA ${sufijo}`, slug: `iva-${sufijo}` },
    });
    ctx.organizationId = org.id;

    const role = await prisma.role.create({
      data: { name: `IVA_${sufijo}`, code: `iva_${sufijo}`, scopes: ['*'] },
    });
    ctx.roleId = role.id;

    const location = await prisma.location.create({
      data: {
        organizationId: org.id,
        name: 'IVA Location',
        city: 'CDMX',
        active: true,
      },
    });
    ctx.locationId = location.id;

    const user = await prisma.user.create({
      data: {
        email: `iva.${org.id}@coffeeos.test`,
        password: await bcrypt.hash(password, 10),
        firstName: 'Iva',
        lastName: 'User',
        organizationId: org.id,
        roleId: role.id,
        active: true,
      },
    });
    ctx.userId = user.id;

    const categoria = await prisma.category.create({
      data: {
        organizationId: org.id,
        name: `Panadería ${sufijo}`,
        sortOrder: 0,
      },
    });
    ctx.categoryId = categoria.id;
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
      await prisma.ticketLine.deleteMany({
        where: { ticketId: { in: ctx.ticketIds } },
      });
      await prisma.ticket.deleteMany({ where: { id: { in: ctx.ticketIds } } });
    }

    await prisma.product.deleteMany({ where: { id: { in: ctx.productIds } } });
    await prisma.category.deleteMany({ where: { id: ctx.categoryId } });
    await prisma.user.deleteMany({ where: { id: ctx.userId } });
    await prisma.location.deleteMany({ where: { id: ctx.locationId } });
    await prisma.role.deleteMany({ where: { id: ctx.roleId } });
    await prisma.organization.deleteMany({
      where: { id: ctx.organizationId },
    });
  }
});
