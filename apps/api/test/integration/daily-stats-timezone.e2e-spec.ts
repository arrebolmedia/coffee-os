import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/database/prisma.service';

/**
 * El corte de caja contra Postgres real.
 *
 * Los tests unitarios comprueban que el rango se calcula bien; esto comprueba
 * lo que ellos no pueden: que la vuelta por la base no lo deshaga. `closed_at`
 * es `timestamp without time zone`, Prisma escribe ahi el instante en UTC, y
 * toda la aritmetica de dias depende de que esa ida y vuelta conserve el
 * instante.
 *
 * La venta de prueba se cobra a las 19:25 hora de Ciudad de Mexico, que en la
 * base queda guardada como el dia siguiente a la 01:25. Es el caso real: en la
 * base de desarrollo hay seis tickets asi, de la tarde del 26 de agosto y
 * sellados como del 27.
 */
describe('Corte de caja y zona horaria (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const password = 'Corte123!';
  /** 19:25 del 26 de agosto en Ciudad de Mexico. */
  const LA_TARDE_DEL_26 = new Date('2026-08-27T01:25:00.000Z');

  const creado: {
    organizationIds: string[];
    locationIds: string[];
    userIds: string[];
    ticketIds: string[];
    roleId?: string;
  } = { organizationIds: [], locationIds: [], userIds: [], ticketIds: [] };

  /** Una cafeteria completa con una venta de la tarde ya cobrada. */
  const cafeterias: Record<string, { organizationId: string; token: string }> =
    {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = app.get(PrismaService);

    const sufijo = Date.now().toString();
    const role = await prisma.role.create({
      data: { name: `CORTE_${sufijo}`, code: `corte_${sufijo}`, scopes: ['*'] },
    });
    creado.roleId = role.id;

    // Dos cafeterias identicas salvo por la zona horaria configurada.
    cafeterias.mexico = await montarCafeteria(
      `mx-${sufijo}`,
      'America/Mexico_City',
    );
    cafeterias.utc = await montarCafeteria(`utc-${sufijo}`, 'UTC');
  }, 60000);

  afterAll(async () => {
    await limpiar();
    await app.close();
  });

  function corte(
    cafeteria: { organizationId: string; token: string },
    dia: string,
  ) {
    return request(app.getHttpServer())
      .get(`/api/v1/pos/stats/daily/${cafeteria.organizationId}?date=${dia}`)
      .set('Authorization', `Bearer ${cafeteria.token}`)
      .expect(200);
  }

  it('la venta de las 19:25 se cuenta en el dia en que se cobro', async () => {
    const res = await corte(cafeterias.mexico, '2026-08-26');

    expect(res.body.total_orders).toBe(1);
    expect(res.body.total_sales).toBe(100);
    expect(res.body.date).toBe('2026-08-26');
  });

  it('y no aparece tambien en el dia siguiente', async () => {
    // Sin esto el arreglo podria estar contandola dos veces.
    const res = await corte(cafeterias.mexico, '2026-08-27');

    expect(res.body.total_orders).toBe(0);
  });

  it('la misma venta, en una cafeteria configurada en UTC, es del dia 27', async () => {
    // Prueba que la zona de la organizacion se consulta de verdad y no es un
    // valor fijo escondido en el codigo.
    const res = await corte(cafeterias.utc, '2026-08-27');

    expect(res.body.total_orders).toBe(1);
  });

  it('y en esa cafeteria el dia 26 sale vacio', async () => {
    const res = await corte(cafeterias.utc, '2026-08-26');

    expect(res.body.total_orders).toBe(0);
  });

  async function montarCafeteria(sufijo: string, timezone: string) {
    const org = await prisma.organization.create({
      data: { name: `Corte ${sufijo}`, slug: `corte-${sufijo}`, timezone },
    });
    creado.organizationIds.push(org.id);

    const location = await prisma.location.create({
      data: {
        organizationId: org.id,
        name: 'Corte Location',
        city: 'CDMX',
        timezone,
        active: true,
      },
    });
    creado.locationIds.push(location.id);

    const user = await prisma.user.create({
      data: {
        email: `corte.${sufijo}@coffeeos.test`,
        password: await bcrypt.hash(password, 10),
        firstName: 'Corte',
        lastName: 'User',
        organizationId: org.id,
        roleId: creado.roleId,
        active: true,
      },
    });
    creado.userIds.push(user.id);

    const ticket = await prisma.ticket.create({
      data: {
        locationId: location.id,
        userId: user.id,
        ticketNumber: `TKT-CORTE-${sufijo}`,
        status: 'CLOSED',
        subtotal: 100,
        total: 100,
        openedAt: LA_TARDE_DEL_26,
        closedAt: LA_TARDE_DEL_26,
      },
    });
    creado.ticketIds.push(ticket.id);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password })
      .expect(200);

    return { organizationId: org.id, token: login.body.accessToken };
  }

  async function limpiar() {
    await prisma.ticket.deleteMany({ where: { id: { in: creado.ticketIds } } });
    await prisma.user.deleteMany({ where: { id: { in: creado.userIds } } });
    await prisma.location.deleteMany({
      where: { id: { in: creado.locationIds } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: creado.organizationIds } },
    });
    if (creado.roleId) {
      await prisma.role.deleteMany({ where: { id: creado.roleId } });
    }
  }
});
