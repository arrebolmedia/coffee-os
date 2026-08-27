import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/database/prisma.service';

/**
 * Regression coverage for the contract/wiring bugs that source-only review and
 * unit tests (Prisma mocks) could not catch — every one of these would have
 * 404'd, 400'd, or leaked across tenants against the real running app:
 *
 *  - GET /orders 404 (OrdersModule was commented out in app.module)
 *  - POST /purchase-orders 400 (DTO used @IsUUID on cuid ids)
 *  - POST /hr/employees 400 (GET /roles read an empty in-memory Map)
 *  - cross-tenant reads returning another org's data
 *
 * Boots the real AppModule against the live Postgres, seeds two isolated orgs,
 * and exercises reads + writes with real JWTs.
 */
describe('Tenancy & write paths (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testPassword = 'TenancyWrites123!';

  type Tenant = {
    organizationId: string;
    roleId: string;
    userId: string;
    userEmail: string;
    locationId: string;
    categoryId: string;
    productId: string;
    inventoryItemId: string;
    token: string;
  };

  const tenants: Record<'a' | 'b', Partial<Tenant>> = { a: {}, b: {} };
  const supplierIds: string[] = [];
  const purchaseOrderIds: string[] = [];
  const createdEmployeeUserIds: string[] = [];
  const campaignIds: string[] = [];

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

    tenants.a = await seedTenant('a');
    tenants.b = await seedTenant('b');
    tenants.a.token = await login(tenants.a.userEmail!);
    tenants.b.token = await login(tenants.b.userEmail!);
  }, 60_000);

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('Multi-tenancy isolation', () => {
    it('GET /products returns only the caller org products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(200);

      const list: Array<{ id: string }> = Array.isArray(res.body)
        ? res.body
        : (res.body.data ?? []);
      const ids = list.map((p) => p.id);

      expect(ids).toContain(tenants.a.productId);
      expect(ids).not.toContain(tenants.b.productId);
    });

    it('GET /products/:id of another org is not readable (404)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/products/${tenants.b.productId}`)
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(404);
    });

    it('rejects unauthenticated reads', async () => {
      await request(app.getHttpServer()).get('/api/v1/products').expect(401);
    });

    /**
     * Fugas confirmadas por sondeo el 2026-08-12: `locations.findById` e
     * `inventory.findById` hacían `findUnique({ where: { id } })` sin filtro de
     * organización y devolvían el registro de otro tenant con un 200.
     */
    it('GET /locations/:id of another org is not readable (404)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/locations/${tenants.b.locationId}`)
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(404);
    });

    it('GET /inventory/:id of another org is not readable (404)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/inventory/${tenants.b.inventoryItemId}`)
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(404);
    });

    it('cada org sí lee sus propios recursos', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/locations/${tenants.a.locationId}`)
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/api/v1/inventory/${tenants.a.inventoryItemId}`)
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(200);
    });
  });

  /**
   * Regresión de la fuga cross-tenant encontrada el 2026-08-12 (Fase 2.5).
   *
   * 19 controllers tomaban `organization_id` del cliente sin contrastarlo con
   * el JWT. Contra la app corriendo se demostró que un usuario de la org A
   * podía leer, enumerar, modificar y BORRAR registros de la org B.
   *
   * Se usa `crm/campaigns` como caso testigo porque ahí se reprodujo la cadena
   * completa. Cada `it` cubre uno de los vectores confirmados.
   */
  describe('Cross-tenant en crm/campaigns (regresión Fase 2.5)', () => {
    let campaignOfB: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/crm/campaigns')
        .set('Authorization', `Bearer ${tenants.b.token}`)
        .send({
          name: 'Campaña privada de B',
          type: 'PROMOTIONAL',
          channels: ['EMAIL'],
          is_automated: false,
        })
        .expect(201);
      campaignOfB = res.body.id;
      campaignIds.push(campaignOfB);
    });

    it('toma la organización del JWT, no del body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/crm/campaigns')
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .send({
          name: 'Campaña de A',
          type: 'PROMOTIONAL',
          channels: ['EMAIL'],
          is_automated: false,
        })
        .expect(201);
      campaignIds.push(res.body.id);
      expect(res.body.organization_id).toBe(tenants.a.organizationId);
    });

    it('IDOR: GET /:id de otra org responde 404', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/crm/campaigns/${campaignOfB}`)
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(404);
    });

    it('enumeración: listar sin organization_id sólo devuelve lo propio', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/crm/campaigns')
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(200);

      const list: Array<{ organization_id: string }> = Array.isArray(res.body)
        ? res.body
        : (res.body.data ?? []);

      expect(list.length).toBeGreaterThan(0);
      expect(
        list.every((c) => c.organization_id === tenants.a.organizationId),
      ).toBe(true);
    });

    it('cross-tenant explícito: ?organization_id=<org B> responde 403', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/v1/crm/campaigns?organization_id=${tenants.b.organizationId}`,
        )
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(403);
    });

    it('escritura cross-tenant: PATCH /:id/status de otra org responde 404', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/crm/campaigns/${campaignOfB}/status`)
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .send({ status: 'PAUSED' })
        .expect(404);
    });

    it('borrado cross-tenant: DELETE /:id de otra org responde 404 y no borra', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/crm/campaigns/${campaignOfB}`)
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(404);

      const survivor = await prisma.campaign.findUnique({
        where: { id: campaignOfB },
      });
      expect(survivor).not.toBeNull();
    });

    it('organización en el path: /waste/stats/<org B> responde 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/waste/stats/${tenants.b.organizationId}`)
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(403);
    });

    // El guard buscaba `organizationId` y `organization_id` por su nombre
    // exacto, y estas cinco rutas del POS declaran el parámetro como `orgId`.
    // Con la API en marcha y el token de una organización, el id de otra en el
    // path devolvía 200 con su corte de caja y sus tickets completos; la misma
    // petición contra `/waste/stats/:organization_id` daba 403. Lo único que
    // separaba un caso del otro era cómo estaba escrito el parámetro.
    describe('la organización en el path se llama `orgId`', () => {
      it.each([
        ['corte de caja', (org: string) => `/api/v1/pos/stats/daily/${org}`],
        [
          'tickets del día',
          (org: string) => `/api/v1/pos/orders/organization/${org}/today`,
        ],
        [
          'tickets por rango',
          (org: string) => `/api/v1/pos/orders/organization/${org}`,
        ],
        [
          'caja abierta',
          (org: string) => `/api/v1/pos/cash-register/current/${org}`,
        ],
        [
          'formas de pago',
          (org: string) => `/api/v1/pos/payment-methods/${org}`,
        ],
      ])('%s de otra organización responde 403', async (_caso, ruta) => {
        await request(app.getHttpServer())
          .get(ruta(tenants.b.organizationId))
          .set('Authorization', `Bearer ${tenants.a.token}`)
          .expect(403);
      });

      it('y la propia sigue respondiendo', async () => {
        await request(app.getHttpServer())
          .get(`/api/v1/pos/stats/daily/${tenants.a.organizationId}`)
          .set('Authorization', `Bearer ${tenants.a.token}`)
          .expect(200);
      });
    });
  });

  describe('GET /orders (OrdersModule mounted)', () => {
    it('responds 200 with a paginated envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/orders?per_page=5')
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /roles (Prisma-backed)', () => {
    it('returns the seeded role from the real table', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/roles')
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(200);

      const list: Array<{ id: string }> = Array.isArray(res.body)
        ? res.body
        : (res.body.data ?? []);
      expect(list.map((r) => r.id)).toContain(tenants.a.roleId);
    });
  });

  describe('Write paths that were previously impossible', () => {
    it('POST /suppliers creates a supplier (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .send({
          organization_id: tenants.a.organizationId,
          name: `Supplier ${Date.now()}`,
          contact_person: 'Contacto',
          email: `supplier.${Date.now()}@coffeeos.test`,
          phone: '5551112222',
          address: 'Proveedores 1',
          payment_terms: 'NET_30',
          lead_time_days: 5,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      supplierIds.push(res.body.id);
    });

    it('POST /purchase-orders persists to Prisma (cuid id, in the DB)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .send({
          organization_id: tenants.a.organizationId,
          supplier_id: supplierIds[0],
          requested_by: tenants.a.userId,
          items: [
            {
              inventory_item_id: tenants.a.inventoryItemId,
              quantity_ordered: 10,
              unit_price: 50,
            },
          ],
        })
        .expect(201);

      const poId = res.body.id ?? res.body.data?.id;
      expect(poId).toBeDefined();
      // Persisted in Postgres (not the old in-memory `po-<ts>` id).
      expect(poId).not.toMatch(/^po-/);
      const row = await prisma.purchaseOrder.findUnique({
        where: { id: poId },
        include: { items: true },
      });
      expect(row).not.toBeNull();
      expect(row!.items).toHaveLength(1);
      if (poId) purchaseOrderIds.push(poId);
    });

    it('POST /hr/employees creates an employee with a real role_id (roles regression)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .send({
          organization_id: tenants.a.organizationId,
          first_name: 'Ana',
          last_name: 'Lopez',
          email: `employee.${Date.now()}@coffeeos.test`,
          phone: '5553334444',
          location_id: tenants.a.locationId,
          role_id: tenants.a.roleId,
          role: 'BARISTA',
          employment_type: 'FULL_TIME',
          hire_date: '2026-01-15',
        })
        .expect(201);

      const empId = res.body.id ?? res.body.data?.id;
      expect(empId).toBeDefined();
      if (empId) createdEmployeeUserIds.push(empId);
    });
  });

  // --- helpers -------------------------------------------------------------

  async function seedTenant(key: 'a' | 'b'): Promise<Partial<Tenant>> {
    const suffix = `${key}-${Date.now()}`;

    const organization = await prisma.organization.create({
      data: { name: `Tenancy Org ${suffix}`, slug: `tenancy-${suffix}` },
    });
    const role = await prisma.role.create({
      data: {
        name: `TENANCY_ROLE_${suffix}`,
        // `code` es obligatorio desde la migración de roles a Prisma; es único
        // por organización, de ahí el sufijo.
        code: `tenancy_role_${suffix}`,
        description: 'Role for tenancy integration tests',
        scopes: ['pos:*'],
      },
    });
    const location = await prisma.location.create({
      data: {
        organizationId: organization.id,
        name: `Loc ${suffix}`,
        address: 'Ave 1',
        city: 'CDMX',
        state: 'CDMX',
        postalCode: '06000',
        phone: '5555555555',
        email: `location.${suffix}@coffeeos.test`,
        active: true,
      },
    });
    const user = await prisma.user.create({
      data: {
        email: `user.${suffix}@coffeeos.test`,
        password: await bcrypt.hash(testPassword, 10),
        firstName: 'Tenancy',
        lastName: 'User',
        organizationId: organization.id,
        roleId: role.id,
        active: true,
      },
    });
    await prisma.userLocation.create({
      data: { userId: user.id, locationId: location.id },
    });
    const category = await prisma.category.create({
      data: {
        organizationId: organization.id,
        name: `Cat ${suffix}`,
        sortOrder: 0,
      },
    });
    const product = await prisma.product.create({
      data: {
        organizationId: organization.id,
        categoryId: category.id,
        sku: `TEN-SKU-${suffix}`,
        name: `Producto ${suffix}`,
        price: 50,
        cost: 20,
        tags: [],
        active: true,
      },
    });
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        organizationId: organization.id,
        code: `TEN-INV-${suffix}`,
        name: `Insumo ${suffix}`,
        unitOfMeasure: 'g',
        costPerUnit: 0.5,
        parLevel: 1000,
        reorderPoint: 200,
        active: true,
      },
    });

    return {
      organizationId: organization.id,
      roleId: role.id,
      userId: user.id,
      userEmail: user.email,
      locationId: location.id,
      categoryId: category.id,
      productId: product.id,
      inventoryItemId: inventoryItem.id,
    };
  }

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: testPassword })
      .expect(200);
    return res.body.accessToken;
  }

  async function cleanup() {
    for (const id of campaignIds) {
      await prisma.campaignRecipient
        .deleteMany({ where: { campaignId: id } })
        .catch(() => undefined);
      await prisma.campaign
        .deleteMany({ where: { id } })
        .catch(() => undefined);
    }
    for (const id of purchaseOrderIds) {
      await prisma.goodsReceipt
        .deleteMany({ where: { purchaseOrderId: id } })
        .catch(() => undefined);
      await prisma.purchaseOrderItem
        .deleteMany({ where: { purchaseOrderId: id } })
        .catch(() => undefined);
      await prisma.purchaseOrder
        .deleteMany({ where: { id } })
        .catch(() => undefined);
    }
    for (const id of supplierIds) {
      await prisma.supplier
        .deleteMany({ where: { id } })
        .catch(() => undefined);
    }
    for (const id of createdEmployeeUserIds) {
      await prisma.userLocation
        .deleteMany({ where: { userId: id } })
        .catch(() => undefined);
      await prisma.user.deleteMany({ where: { id } }).catch(() => undefined);
    }

    for (const t of [tenants.a, tenants.b]) {
      if (!t.organizationId) continue;
      await prisma.inventoryItem
        .deleteMany({ where: { organizationId: t.organizationId } })
        .catch(() => undefined);
      await prisma.product
        .deleteMany({ where: { id: t.productId } })
        .catch(() => undefined);
      await prisma.category
        .deleteMany({ where: { id: t.categoryId } })
        .catch(() => undefined);
      await prisma.userLocation
        .deleteMany({ where: { userId: t.userId } })
        .catch(() => undefined);
      await prisma.user
        .deleteMany({ where: { id: t.userId } })
        .catch(() => undefined);
      await prisma.location
        .deleteMany({ where: { id: t.locationId } })
        .catch(() => undefined);
      await prisma.role
        .deleteMany({ where: { id: t.roleId } })
        .catch(() => undefined);
      await prisma.organization
        .deleteMany({ where: { id: t.organizationId } })
        .catch(() => undefined);
    }
  }
});
