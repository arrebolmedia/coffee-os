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

    /**
     * Los tickets son la venta: llevan lo que se compró, cuánto se pagó y con
     * qué método, además del cliente. `Ticket` no tiene columna
     * `organizationId` —la deriva de la sucursal—, así que la extensión de
     * tenancy no puede filtrarlo y el filtro lo tenía que poner el servicio.
     * No lo ponía en ninguna de las tres rutas.
     */
    describe('tickets del POS', () => {
      let ticketDeB: string;

      beforeAll(async () => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/pos/tickets')
          .set('Authorization', `Bearer ${tenants.b.token}`)
          .send({
            locationId: tenants.b.locationId,
            userId: tenants.b.userId,
            lines: [
              { productId: tenants.b.productId, quantity: 1, unitPrice: 40 },
            ],
          })
          .expect(201);
        ticketDeB = res.body.id;
      });

      it('el detalle de un ticket ajeno responde 404', async () => {
        // Devolvía el ticket entero —líneas, pagos, cliente— con sólo tener su
        // id, sin comprobar de quién era.
        await request(app.getHttpServer())
          .get(`/api/v1/pos/tickets/${ticketDeB}`)
          .set('Authorization', `Bearer ${tenants.a.token}`)
          .expect(404);
      });

      it('el propio sí se lee', async () => {
        await request(app.getHttpServer())
          .get(`/api/v1/pos/tickets/${ticketDeB}`)
          .set('Authorization', `Bearer ${tenants.b.token}`)
          .expect(200);
      });

      it('listar por la sucursal de otro no devuelve nada', async () => {
        // El `locationId` viaja por query: bastaba poner la sucursal ajena.
        const res = await request(app.getHttpServer())
          .get(`/api/v1/pos/tickets?locationId=${tenants.b.locationId}`)
          .set('Authorization', `Bearer ${tenants.a.token}`)
          .expect(200);

        expect(res.body).toEqual([]);
      });

      it('y por la propia sí', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/pos/tickets?locationId=${tenants.b.locationId}`)
          .set('Authorization', `Bearer ${tenants.b.token}`)
          .expect(200);

        expect(res.body.map((t: any) => t.id)).toContain(ticketDeB);
      });

      it('no se puede cobrar una venta en la sucursal de otro', async () => {
        // Esta no era una fuga de lectura sino de escritura: un usuario
        // autenticado podía registrar ventas en la cafetería de al lado.
        await request(app.getHttpServer())
          .post('/api/v1/pos/tickets')
          .set('Authorization', `Bearer ${tenants.a.token}`)
          .send({
            locationId: tenants.b.locationId,
            userId: tenants.a.userId,
            lines: [
              { productId: tenants.a.productId, quantity: 1, unitPrice: 10 },
            ],
          })
          .expect(404);
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

    /**
     * Un empleado dado de alta tiene que poder trabajar.
     *
     * Hasta aqui no podia: el alta generaba una contrasena aleatoria de 32
     * caracteres que no se le ensenaba a nadie, y el comentario mandaba al
     * empleado a recuperarla "through the auth password-reset flow" — un flujo
     * que no existe. `change-password` exige sesion iniciada Y la contrasena
     * actual, asi que no habia manera de entrar. El dueno contrataba a un
     * cajero, lo daba de alta, y el cajero se quedaba fuera para siempre.
     *
     * Y aunque hubiera entrado, tampoco habria podido cobrar: no se creaba la
     * fila de `user_locations`, asi que el login devolvia una sesion sin
     * sucursal y el POS no tiene donde vender.
     */
    it('el empleado dado de alta puede entrar con la contrasena que se le asigna', async () => {
      const email = `cajera.${Date.now()}@coffeeos.test`;
      const contrasena = 'Cajera2026!';

      const alta = await request(app.getHttpServer())
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .send({
          organization_id: tenants.a.organizationId,
          first_name: 'Lucia',
          last_name: 'Ramos',
          email,
          phone: '5551112222',
          location_id: tenants.a.locationId,
          role_id: tenants.a.roleId,
          role: 'CASHIER',
          employment_type: 'FULL_TIME',
          hire_date: '2026-09-01',
          password: contrasena,
        })
        .expect(201);

      const empId = alta.body.id ?? alta.body.data?.id;
      if (empId) createdEmployeeUserIds.push(empId);

      // La contrasena elegida por el dueno NO se devuelve: ya la conoce.
      expect(alta.body.temporary_password).toBeUndefined();

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: contrasena })
        .expect(200);

      expect(login.body.accessToken).toBeTruthy();
      // Y entra con su sucursal, o no tendria donde cobrar.
      expect(login.body.user.locationId).toBe(tenants.a.locationId);
      expect(login.body.user.organizationId).toBe(tenants.a.organizationId);
    });

    it('sin contrasena, el alta devuelve una temporal que el dueno puede entregar', async () => {
      const email = `barista.${Date.now()}@coffeeos.test`;

      const alta = await request(app.getHttpServer())
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .send({
          organization_id: tenants.a.organizationId,
          first_name: 'Mario',
          last_name: 'Cruz',
          email,
          phone: '5553334455',
          location_id: tenants.a.locationId,
          role_id: tenants.a.roleId,
          role: 'BARISTA',
          employment_type: 'PART_TIME',
          hire_date: '2026-09-01',
        })
        .expect(201);

      const empId = alta.body.id ?? alta.body.data?.id;
      if (empId) createdEmployeeUserIds.push(empId);

      const temporal = alta.body.temporary_password;
      expect(typeof temporal).toBe('string');
      expect(temporal.length).toBeGreaterThanOrEqual(8);

      // Y sirve de verdad: no es un adorno.
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: temporal })
        .expect(200);

      expect(login.body.accessToken).toBeTruthy();
    });

    it('el dueno puede reponer la contrasena de un empleado que la olvido', async () => {
      const email = `olvidadiza.${Date.now()}@coffeeos.test`;

      const alta = await request(app.getHttpServer())
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .send({
          organization_id: tenants.a.organizationId,
          first_name: 'Rosa',
          last_name: 'Diaz',
          email,
          phone: '5556667777',
          location_id: tenants.a.locationId,
          role_id: tenants.a.roleId,
          role: 'CASHIER',
          employment_type: 'FULL_TIME',
          hire_date: '2026-09-01',
        })
        .expect(201);

      const empId = alta.body.id ?? alta.body.data?.id;
      if (empId) createdEmployeeUserIds.push(empId);

      const reset = await request(app.getHttpServer())
        .post(`/api/v1/hr/employees/${empId}/reset-password`)
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(201);

      const nueva = reset.body.temporary_password;
      expect(typeof nueva).toBe('string');

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: nueva })
        .expect(200);
    });

    /**
     * La contrasena que le dictaron al empleado la conocen dos personas.
     *
     * Con ella se puede cobrar, hacer un corte de caja o borrar productos. El
     * hueco dura desde que el dueno se la dice hasta que el empleado la cambia,
     * y sin nada que lo fuerce ese hueco no se cierra nunca: nadie cambia una
     * contrasena que ya le funciona.
     */
    it('con la contrasena recien dictada la sesion solo sirve para cambiarla', async () => {
      const email = `bloqueada.${Date.now()}@coffeeos.test`;

      const alta = await request(app.getHttpServer())
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .send({
          organization_id: tenants.a.organizationId,
          first_name: 'Sofia',
          last_name: 'Nava',
          email,
          phone: '5558889999',
          location_id: tenants.a.locationId,
          role_id: tenants.a.roleId,
          role: 'CASHIER',
          employment_type: 'FULL_TIME',
          hire_date: '2026-09-01',
        })
        .expect(201);

      const empId = alta.body.id ?? alta.body.data?.id;
      if (empId) createdEmployeeUserIds.push(empId);
      const temporal = alta.body.temporary_password;

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: temporal })
        .expect(200);
      const token = login.body.accessToken;

      // Entrar, si. Trabajar, todavia no.
      const bloqueado = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(bloqueado.body.error).toBe('MUST_CHANGE_PASSWORD');

      // Y no se sale del paso poniendo la misma.
      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: temporal, newPassword: temporal })
        .expect(400);

      // Saber quien es y cerrar sesion si se puede: si no, es un callejon.
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Al cambiarla, el bloqueo se levanta con el MISMO token: la marca se lee
      // de la base en cada peticion, no del JWT.
      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: temporal, newPassword: 'SuyaPropia2026!' })
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Y entra con la suya.
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: 'SuyaPropia2026!' })
        .expect(200);
    });

    it('reponer la contrasena vuelve a bloquear la sesion', async () => {
      const email = `repuesta.${Date.now()}@coffeeos.test`;

      const alta = await request(app.getHttpServer())
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .send({
          organization_id: tenants.a.organizationId,
          first_name: 'Hugo',
          last_name: 'Marin',
          email,
          phone: '5551239876',
          location_id: tenants.a.locationId,
          role_id: tenants.a.roleId,
          role: 'BARISTA',
          employment_type: 'FULL_TIME',
          hire_date: '2026-09-01',
          password: 'ElijeElDueno1!',
        })
        .expect(201);

      const empId = alta.body.id ?? alta.body.data?.id;
      if (empId) createdEmployeeUserIds.push(empId);

      const reset = await request(app.getHttpServer())
        .post(`/api/v1/hr/employees/${empId}/reset-password`)
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(201);

      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password: reset.body.temporary_password })
        .expect(200);

      // Misma situacion: la repuesta tambien la conoce el dueno.
      await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(403);
    });

    it('no se puede reponer la contrasena de un empleado de otra organizacion', async () => {
      // El id existe, pero es del otro inquilino: tiene que salir 404, no un
      // 403 que confirme que existe, y desde luego no una contrasena nueva.
      await request(app.getHttpServer())
        .post(`/api/v1/hr/employees/${tenants.b.userId}/reset-password`)
        .set('Authorization', `Bearer ${tenants.a.token}`)
        .expect(404);
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
