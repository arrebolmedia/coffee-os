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

    it('POST /purchase-orders creates an order with cuid ids (@IsUUID regression)', async () => {
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

      expect(res.body.id ?? res.body.data?.id).toBeDefined();
      const poId = res.body.id ?? res.body.data?.id;
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
    // Purchase orders are still served from an in-memory store (ids look like
    // `po-<ts>`), so there is nothing to delete in Postgres for them.
    void purchaseOrderIds;
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
