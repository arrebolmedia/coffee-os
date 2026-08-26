import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/database/prisma.service';

/**
 * El descuento automático de insumos, probado contra Postgres real.
 *
 * Existe porque durante meses el módulo respondía `enabled: true` y no
 * descontaba nada: `deductForOrder` sólo era alcanzable desde su propio
 * endpoint y el hook del frontend que debía invocarlo estaba huérfano. Los
 * tests unitarios no lo detectaban porque probaban el método directamente —
 * exactamente lo que nadie llamaba. Esta suite recorre el camino real: mover
 * la orden de estado por HTTP y comprobar el stock en la base.
 */
describe('Auto stock deduction on sale (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testPassword = 'AutoDeduct123!';

  // Receta: 200 ml de insumo por unidad de producto. Se venden 2 -> 400 ml.
  const STOCK_INICIAL = 1000;
  const ML_POR_UNIDAD = 200;
  const UNIDADES_VENDIDAS = 2;
  const STOCK_ESPERADO = STOCK_INICIAL - ML_POR_UNIDAD * UNIDADES_VENDIDAS;

  const ctx: {
    organizationId?: string;
    otherOrganizationId?: string;
    roleId?: string;
    otherRoleId?: string;
    userId?: string;
    otherUserId?: string;
    userEmail?: string;
    otherUserEmail?: string;
    locationId?: string;
    categoryId?: string;
    productId?: string;
    inventoryItemId?: string;
    recipeId?: string;
    ticketIds: string[];
    orderIds: string[];
  } = { ticketIds: [], orderIds: [] };

  let authToken: string;
  let otherOrgToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);

    await setupTestData();
    authToken = await login(ctx.userEmail!);
    otherOrgToken = await login(ctx.otherUserEmail!);
  }, 60000);

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  describe('con el descuento automático activado', () => {
    let orderId: string;

    beforeAll(async () => {
      orderId = await venderYObtenerOrden();
    });

    it('descuenta los insumos al marcar la orden como servida', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/pos/orders/${orderId}/served`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.status).toBe('SERVED');
      expect(response.body.inventory_deduction).toMatchObject({
        status: 'deducted',
        items_deducted: 1,
      });

      const item = await prisma.inventoryItem.findUnique({
        where: { id: ctx.inventoryItemId },
      });
      expect(item?.currentStock).toBeCloseTo(STOCK_ESPERADO, 4);

      const movimientos = await prisma.inventoryMovement.findMany({
        where: { reference: `ORDER:${orderId}`, reason: 'RECIPE_DEDUCTION' },
      });
      expect(movimientos).toHaveLength(1);
      expect(movimientos[0].type).toBe('OUT');
      expect(movimientos[0].quantity).toBeCloseTo(
        ML_POR_UNIDAD * UNIDADES_VENDIDAS,
        4,
      );
    });

    it('no vuelve a descontar al pasar de SERVED a COMPLETED', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/pos/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      // No es un error: es la idempotencia funcionando. El segundo intento se
      // salta el descuento en vez de duplicarlo.
      expect(response.body.inventory_deduction.status).toBe('skipped');

      const item = await prisma.inventoryItem.findUnique({
        where: { id: ctx.inventoryItemId },
      });
      expect(item?.currentStock).toBeCloseTo(STOCK_ESPERADO, 4);

      const movimientos = await prisma.inventoryMovement.count({
        where: { reference: `ORDER:${orderId}`, reason: 'RECIPE_DEDUCTION' },
      });
      expect(movimientos).toBe(1);
    });

    it('no descuenta al pasar por estados que no son una venta consumada', async () => {
      const otraOrden = await venderYObtenerOrden();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/pos/orders/${otraOrden}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.inventory_deduction).toBeUndefined();

      const movimientos = await prisma.inventoryMovement.count({
        where: { reference: `ORDER:${otraOrden}` },
      });
      expect(movimientos).toBe(0);
    });
  });

  describe('con el descuento automático desactivado', () => {
    it('respeta el flag y no toca el stock', async () => {
      await setAutoDeduct(false);
      const stockAntes = (
        await prisma.inventoryItem.findUnique({
          where: { id: ctx.inventoryItemId },
        })
      )?.currentStock;

      const orderId = await venderYObtenerOrden();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/pos/orders/${orderId}/served`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.inventory_deduction.status).toBe('disabled');

      const item = await prisma.inventoryItem.findUnique({
        where: { id: ctx.inventoryItemId },
      });
      expect(item?.currentStock).toBeCloseTo(stockAntes ?? 0, 4);

      await setAutoDeduct(true);
    });
  });

  describe('aislamiento entre organizaciones', () => {
    it('no deja mover de estado la orden de otra organización', async () => {
      const orderId = await venderYObtenerOrden();

      // Antes estos endpoints recibían sólo el id y actualizaban por
      // `where: { id }`, sin comprobar la organización.
      await request(app.getHttpServer())
        .post(`/api/v1/pos/orders/${orderId}/served`)
        .set('Authorization', `Bearer ${otherOrgToken}`)
        .expect(404);

      const orden = await prisma.order.findUnique({ where: { id: orderId } });
      expect(orden?.status).toBe('PENDING');

      const movimientos = await prisma.inventoryMovement.count({
        where: { reference: `ORDER:${orderId}` },
      });
      expect(movimientos).toBe(0);
    });
  });

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /** Vende `UNIDADES_VENDIDAS` del producto y devuelve el id de la orden creada. */
  async function venderYObtenerOrden(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/pos/tickets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        locationId: ctx.locationId,
        userId: ctx.userId,
        lines: [
          {
            productId: ctx.productId,
            quantity: UNIDADES_VENDIDAS,
            unitPrice: 48,
          },
        ],
      })
      .expect(201);

    ctx.ticketIds.push(response.body.id);

    const orders = await prisma.order.findMany({
      where: { ticketId: response.body.id },
    });
    expect(orders).toHaveLength(1);
    ctx.orderIds.push(orders[0].id);
    return orders[0].id;
  }

  async function setAutoDeduct(enabled: boolean) {
    await prisma.setting.upsert({
      where: {
        organizationId_category_key: {
          organizationId: ctx.organizationId!,
          category: 'inventory',
          key: 'auto_deduct',
        },
      },
      create: {
        organizationId: ctx.organizationId!,
        category: 'inventory',
        key: 'auto_deduct',
        type: 'json',
        value: { enabled, allow_negative_stock: false },
      },
      update: { value: { enabled, allow_negative_stock: false } },
    });
  }

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: testPassword })
      .expect(200);
    return response.body.accessToken;
  }

  async function setupTestData() {
    const suffix = Date.now().toString();
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    const organization = await prisma.organization.create({
      data: {
        name: `AutoDeduct Org ${suffix}`,
        slug: `auto-deduct-${suffix}`,
      },
    });
    ctx.organizationId = organization.id;

    const otherOrganization = await prisma.organization.create({
      data: {
        name: `AutoDeduct Other Org ${suffix}`,
        slug: `auto-deduct-other-${suffix}`,
      },
    });
    ctx.otherOrganizationId = otherOrganization.id;

    const role = await prisma.role.create({
      data: {
        name: `AUTODEDUCT_ROLE_${suffix}`,
        code: `autodeduct_role_${suffix}`,
        scopes: ['pos:*', 'inventory:*'],
      },
    });
    ctx.roleId = role.id;

    const otherRole = await prisma.role.create({
      data: {
        name: `AUTODEDUCT_OTHER_ROLE_${suffix}`,
        code: `autodeduct_other_role_${suffix}`,
        scopes: ['pos:*', 'inventory:*'],
      },
    });
    ctx.otherRoleId = otherRole.id;

    const location = await prisma.location.create({
      data: {
        organizationId: organization.id,
        name: 'AutoDeduct Location',
        address: 'Deduct Ave 1',
        city: 'CDMX',
        state: 'CDMX',
        postalCode: '06000',
        phone: '5555555555',
        email: `autodeduct.location.${suffix}@coffeeos.test`,
        active: true,
      },
    });
    ctx.locationId = location.id;

    const user = await prisma.user.create({
      data: {
        email: `autodeduct.user.${suffix}@coffeeos.test`,
        password: hashedPassword,
        firstName: 'Auto',
        lastName: 'Deduct',
        organizationId: organization.id,
        roleId: role.id,
        active: true,
      },
    });
    ctx.userId = user.id;
    ctx.userEmail = user.email;

    const otherUser = await prisma.user.create({
      data: {
        email: `autodeduct.other.${suffix}@coffeeos.test`,
        password: hashedPassword,
        firstName: 'Other',
        lastName: 'Org',
        organizationId: otherOrganization.id,
        roleId: otherRole.id,
        active: true,
      },
    });
    ctx.otherUserId = otherUser.id;
    ctx.otherUserEmail = otherUser.email;

    await prisma.userLocation.create({
      data: { userId: user.id, locationId: location.id },
    });

    const category = await prisma.category.create({
      data: {
        organizationId: organization.id,
        name: `AutoDeduct Drinks ${suffix}`,
        sortOrder: 0,
      },
    });
    ctx.categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        organizationId: organization.id,
        categoryId: category.id,
        sku: `AUTODEDUCT-${suffix}`,
        name: 'Latte con receta',
        price: 48,
        cost: 18,
        tags: [],
        active: true,
      },
    });
    ctx.productId = product.id;

    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        organizationId: organization.id,
        code: `LECHE-${suffix}`,
        name: 'Leche entera',
        unitOfMeasure: 'ml',
        costPerUnit: 0.02,
        currentStock: STOCK_INICIAL,
        reorderPoint: 100,
        active: true,
      },
    });
    ctx.inventoryItemId = inventoryItem.id;

    const recipe = await prisma.recipe.create({
      data: {
        organizationId: organization.id,
        productId: product.id,
        name: 'Receta de Latte',
        yield: 1,
        yieldUnit: 'unit',
        allergens: [],
        active: true,
        ingredients: {
          create: [
            {
              inventoryItemId: inventoryItem.id,
              quantity: ML_POR_UNIDAD,
              unit: 'ml',
            },
          ],
        },
      },
    });
    ctx.recipeId = recipe.id;

    await setAutoDeduct(true);
  }

  async function cleanupTestData() {
    if (!ctx.organizationId) return;

    await prisma.inventoryMovement.deleteMany({
      where: { inventoryItemId: ctx.inventoryItemId },
    });
    await prisma.recipeIngredient.deleteMany({
      where: { recipeId: ctx.recipeId },
    });
    await prisma.recipe.deleteMany({ where: { id: ctx.recipeId } });
    await prisma.inventoryItem.deleteMany({
      where: { id: ctx.inventoryItemId },
    });

    if (ctx.orderIds.length) {
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: ctx.orderIds } },
      });
      await prisma.order.deleteMany({ where: { id: { in: ctx.orderIds } } });
    }
    if (ctx.ticketIds.length) {
      await prisma.ticketLineModifier.deleteMany({
        where: { ticketLine: { ticketId: { in: ctx.ticketIds } } },
      });
      await prisma.ticketLine.deleteMany({
        where: { ticketId: { in: ctx.ticketIds } },
      });
      await prisma.ticket.deleteMany({ where: { id: { in: ctx.ticketIds } } });
    }

    await prisma.setting.deleteMany({
      where: { organizationId: ctx.organizationId },
    });
    await prisma.product.deleteMany({ where: { id: ctx.productId } });
    await prisma.category.deleteMany({ where: { id: ctx.categoryId } });
    await prisma.userLocation.deleteMany({ where: { userId: ctx.userId } });
    await prisma.user.deleteMany({
      where: { id: { in: [ctx.userId!, ctx.otherUserId!] } },
    });
    await prisma.location.deleteMany({ where: { id: ctx.locationId } });
    await prisma.role.deleteMany({
      where: { id: { in: [ctx.roleId!, ctx.otherRoleId!] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [ctx.organizationId!, ctx.otherOrganizationId!] } },
    });
  }
});
