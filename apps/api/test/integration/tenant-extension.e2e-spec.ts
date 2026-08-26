import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/database/prisma.service';
import {
  runInTenantScope,
  runUnscoped,
  setTenantContext,
} from '../../src/common/tenancy/tenant-context';

/**
 * La extensión de tenancy, contra Postgres real.
 *
 * Esta suite existe porque el resto de los e2e **pasarían igual si la extensión
 * estuviera inerte**: todos consultan a través de servicios que ya filtran a
 * mano. Aquí se hace lo contrario — consultas deliberadamente SIN filtro, para
 * comprobar que lo pone la extensión y no el que escribió la consulta.
 */
describe('Prisma tenant extension (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const ids: {
    orgA?: string;
    orgB?: string;
    categoryA?: string;
    categoryB?: string;
    productA?: string;
    productB?: string;
  } = {};

  /**
   * Ejecuta `fn` como si fuera una petición autenticada de esa organización.
   *
   * El `await` va DENTRO del scope a propósito. Prisma devuelve una
   * `PrismaPromise` perezosa: la consulta no se ejecuta al construirla sino al
   * esperarla, así que devolver la promesa sin esperar la sacaría del contexto
   * y se ejecutaría sin filtro. En la aplicación real no pasa porque el
   * middleware envuelve la petición entera, awaits incluidos.
   */
  async function asOrg<T>(
    organizationId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return runInTenantScope(async () => {
      setTenantContext({ organizationId, isSuperAdmin: false });
      return await fn();
    });
  }

  async function asSuperAdmin<T>(
    organizationId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return runInTenantScope(async () => {
      setTenantContext({ organizationId, isSuperAdmin: true });
      return await fn();
    });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const suffix = Date.now().toString();

    // El seed corre fuera de cualquier contexto de petición, así que la
    // extensión no inyecta nada: es el mismo caso que un script.
    const orgA = await prisma.organization.create({
      data: { name: `Ext A ${suffix}`, slug: `ext-a-${suffix}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: `Ext B ${suffix}`, slug: `ext-b-${suffix}` },
    });
    ids.orgA = orgA.id;
    ids.orgB = orgB.id;

    const catA = await prisma.category.create({
      data: { organizationId: orgA.id, name: `Cat A ${suffix}`, sortOrder: 0 },
    });
    const catB = await prisma.category.create({
      data: { organizationId: orgB.id, name: `Cat B ${suffix}`, sortOrder: 0 },
    });
    ids.categoryA = catA.id;
    ids.categoryB = catB.id;

    const prodA = await prisma.product.create({
      data: {
        organizationId: orgA.id,
        categoryId: catA.id,
        sku: `EXT-A-${suffix}`,
        name: 'Producto de A',
        price: 10,
        tags: [],
      },
    });
    const prodB = await prisma.product.create({
      data: {
        organizationId: orgB.id,
        categoryId: catB.id,
        sku: `EXT-B-${suffix}`,
        name: 'Producto de B',
        price: 10,
        tags: [],
      },
    });
    ids.productA = prodA.id;
    ids.productB = prodB.id;
  }, 60000);

  afterAll(async () => {
    await prisma.product.deleteMany({
      where: { id: { in: [ids.productA!, ids.productB!] } },
    });
    await prisma.category.deleteMany({
      where: { id: { in: [ids.categoryA!, ids.categoryB!] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [ids.orgA!, ids.orgB!] } },
    });
    await app.close();
  });

  describe('lecturas', () => {
    it('findMany sin where sólo devuelve lo de la organización', async () => {
      const products = await asOrg(ids.orgA!, () =>
        prisma.product.findMany({
          where: { name: { contains: 'Producto de' } },
        }),
      );

      const orgs = new Set(products.map((p) => p.organizationId));
      expect(orgs).toEqual(new Set([ids.orgA]));
      expect(products.map((p) => p.id)).not.toContain(ids.productB);
    });

    it('findUnique por id ajeno devuelve null, no la fila', async () => {
      // La consulta pide el id de B explícitamente y no lleva ningún filtro de
      // organización: si la extensión no estuviera activa, devolvería la fila.
      const found = await asOrg(ids.orgA!, () =>
        prisma.product.findUnique({ where: { id: ids.productB! } }),
      );
      expect(found).toBeNull();
    });

    it('findUnique por id propio sigue funcionando', async () => {
      const found = await asOrg(ids.orgA!, () =>
        prisma.product.findUnique({ where: { id: ids.productA! } }),
      );
      expect(found?.id).toBe(ids.productA);
    });

    it('count no cuenta filas ajenas', async () => {
      const total = await asOrg(ids.orgA!, () =>
        prisma.product.count({ where: { name: { contains: 'Producto de' } } }),
      );
      expect(total).toBe(1);
    });

    it('no anula un OR propio de la consulta', async () => {
      // Con fusión de claves en vez de AND, este OR se evaluaría en paralelo al
      // filtro de organización y devolvería también el producto de B.
      const products = await asOrg(ids.orgA!, () =>
        prisma.product.findMany({
          where: { OR: [{ name: 'Producto de A' }, { name: 'Producto de B' }] },
        }),
      );
      expect(products).toHaveLength(1);
      expect(products[0].id).toBe(ids.productA);
    });
  });

  describe('escrituras', () => {
    it('un create nace con la organización del contexto', async () => {
      const created = await asOrg(ids.orgA!, () =>
        prisma.category.create({
          data: { name: `Sin org ${Date.now()}`, sortOrder: 1 } as never,
        }),
      );
      expect(created.organizationId).toBe(ids.orgA);
      await prisma.category.deleteMany({ where: { id: created.id } });
    });

    it('rechaza crear en otra organización en vez de corregirlo en silencio', async () => {
      await expect(
        asOrg(ids.orgA!, () =>
          prisma.category.create({
            data: {
              organizationId: ids.orgB!,
              name: `Intruso ${Date.now()}`,
              sortOrder: 1,
            },
          }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('no deja actualizar una fila ajena', async () => {
      await expect(
        asOrg(ids.orgA!, () =>
          prisma.product.update({
            where: { id: ids.productB! },
            data: { name: 'Secuestrado' },
          }),
        ),
      ).rejects.toThrow();

      const untouched = await prisma.product.findUnique({
        where: { id: ids.productB! },
      });
      expect(untouched?.name).toBe('Producto de B');
    });

    it('no deja borrar una fila ajena', async () => {
      await expect(
        asOrg(ids.orgA!, () =>
          prisma.product.delete({ where: { id: ids.productB! } }),
        ),
      ).rejects.toThrow();

      const alive = await prisma.product.findUnique({
        where: { id: ids.productB! },
      });
      expect(alive).not.toBeNull();
    });

    it('deleteMany sin where no arrasa con otras organizaciones', async () => {
      // El caso que convirtió `if (query.organization_id)` en enumeración
      // total: omitir el filtro. Aquí ni siquiera hay forma de omitirlo.
      const result = await asOrg(ids.orgA!, () =>
        prisma.product.deleteMany({ where: { name: 'Producto de B' } }),
      );
      expect(result.count).toBe(0);

      const alive = await prisma.product.findUnique({
        where: { id: ids.productB! },
      });
      expect(alive).not.toBeNull();
    });
  });

  describe('vías de escape declaradas', () => {
    it('runUnscoped ve todas las organizaciones', async () => {
      const products = await asOrg(ids.orgA!, () =>
        runUnscoped(() =>
          prisma.product.findMany({
            where: { id: { in: [ids.productA!, ids.productB!] } },
          }),
        ),
      );
      expect(products).toHaveLength(2);
    });

    it('runUnscoped restaura el contexto al salir, incluso siendo async', async () => {
      // Restaurar en un finally síncrono devolvería el contexto antes de que
      // terminaran los await de dentro; el scope anidado no tiene ese problema.
      const [dentro, despues] = await asOrg(ids.orgA!, async () => {
        const unscoped = await runUnscoped(async () => {
          await new Promise((r) => setTimeout(r, 10));
          return prisma.product.findMany({
            where: { id: { in: [ids.productA!, ids.productB!] } },
          });
        });
        const scoped = await prisma.product.findMany({
          where: { id: { in: [ids.productA!, ids.productB!] } },
        });
        return [unscoped, scoped];
      });

      expect(dentro).toHaveLength(2);
      expect(despues).toHaveLength(1);
      expect(despues[0].id).toBe(ids.productA);
    });

    it('el super admin cruza organizaciones por diseño', async () => {
      const products = await asSuperAdmin(ids.orgA!, () =>
        prisma.product.findMany({
          where: { id: { in: [ids.productA!, ids.productB!] } },
        }),
      );
      expect(products).toHaveLength(2);
    });

    it('sin contexto (script, ruta pública) no se inyecta nada', async () => {
      const products = await prisma.product.findMany({
        where: { id: { in: [ids.productA!, ids.productB!] } },
      });
      expect(products).toHaveLength(2);
    });
  });

  describe('catálogo compartido', () => {
    it('los roles globales siguen siendo visibles para el tenant', async () => {
      // Con filtro de igualdad a secas, `organizationId = org` escondería todas
      // las filas con null y cada organización se quedaría sin roles de sistema.
      const suffix = Date.now().toString();
      const global = await prisma.role.create({
        data: {
          name: `Global ${suffix}`,
          code: `global_${suffix}`,
          organizationId: null,
          scopes: [],
        },
      });

      const roles = await asOrg(ids.orgA!, () =>
        prisma.role.findMany({ where: { id: global.id } }),
      );
      expect(roles).toHaveLength(1);

      await prisma.role.deleteMany({ where: { id: global.id } });
    });
  });
});
