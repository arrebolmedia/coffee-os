import {
  applyTenantToData,
  mergeWhere,
  MODEL_POLICIES,
  policyFor,
  rowBelongsToTenant,
  tenantFilter,
} from '../tenant-scope';

const ORG = 'org-a';
const OTHER = 'org-b';

describe('tenant-scope', () => {
  describe('policyFor', () => {
    it('trata como estricto un modelo con organizationId', () => {
      expect(policyFor('Product')).toBe('strict');
      expect(policyFor('Customer')).toBe('strict');
    });

    it('trata Role y Permission como catálogo compartido', () => {
      // Ambos tienen organizationId NULLABLE: las filas con null son el
      // catálogo de sistema que ven todas las organizaciones.
      expect(policyFor('Role')).toBe('shared-global');
      expect(policyFor('Permission')).toBe('shared-global');
    });

    it('exime lo que no declara organizationId', () => {
      // Order, Ticket y Shift derivan la organización de la sucursal: la
      // extensión no puede inyectar una columna que no existe.
      expect(policyFor('Order')).toBe('exempt');
      expect(policyFor('Ticket')).toBe('exempt');
      expect(policyFor('Organization')).toBe('exempt');
      expect(policyFor(undefined)).toBe('exempt');
    });

    it('exime cualquier modelo desconocido en vez de romper', () => {
      expect(policyFor('ModeloQueNoExiste')).toBe('exempt');
    });
  });

  describe('tenantFilter', () => {
    it('filtra por igualdad en los modelos estrictos', () => {
      expect(tenantFilter('strict', ORG)).toEqual({ organizationId: ORG });
    });

    it('deja ver el catálogo global en los compartidos', () => {
      expect(tenantFilter('shared-global', ORG)).toEqual({
        OR: [{ organizationId: ORG }, { organizationId: null }],
      });
    });

    it('no filtra los exentos', () => {
      expect(tenantFilter('exempt', ORG)).toBeNull();
    });
  });

  describe('mergeWhere', () => {
    it('usa el filtro tal cual cuando no había where', () => {
      expect(mergeWhere(undefined, { organizationId: ORG })).toEqual({
        organizationId: ORG,
      });
      expect(mergeWhere({}, { organizationId: ORG })).toEqual({
        organizationId: ORG,
      });
    });

    it('combina con AND, no fusionando claves', () => {
      // Esto es lo que importa: si el where de la llamada trae su propio OR y
      // se fusionaran las claves al mismo nivel, ese OR se evaluaría en
      // paralelo al filtro de organización y lo anularía.
      const where = { OR: [{ name: 'a' }, { name: 'b' }] };
      expect(mergeWhere(where, { organizationId: ORG })).toEqual({
        AND: [where, { organizationId: ORG }],
      });
    });

    it('conserva el where original sin mutarlo', () => {
      const where = { active: true };
      const merged = mergeWhere(where, { organizationId: ORG });
      expect(where).toEqual({ active: true });
      expect(merged).toEqual({
        AND: [{ active: true }, { organizationId: ORG }],
      });
    });
  });

  describe('rowBelongsToTenant', () => {
    it('acepta la fila propia', () => {
      expect(rowBelongsToTenant({ organizationId: ORG }, 'strict', ORG)).toBe(
        true,
      );
    });

    it('rechaza la fila ajena', () => {
      expect(rowBelongsToTenant({ organizationId: OTHER }, 'strict', ORG)).toBe(
        false,
      );
    });

    it('rechaza el catálogo global bajo política estricta', () => {
      expect(rowBelongsToTenant({ organizationId: null }, 'strict', ORG)).toBe(
        false,
      );
    });

    it('acepta el catálogo global bajo política compartida', () => {
      expect(
        rowBelongsToTenant({ organizationId: null }, 'shared-global', ORG),
      ).toBe(true);
    });

    it('deja pasar null y filas sin la columna', () => {
      // `select` puede haber pedido sólo algunas columnas; descartar por
      // ausencia de organizationId haría desaparecer resultados legítimos.
      expect(rowBelongsToTenant(null, 'strict', ORG)).toBe(true);
      expect(rowBelongsToTenant({ id: 'x' }, 'strict', ORG)).toBe(true);
    });
  });

  describe('applyTenantToData', () => {
    it('pone la organización cuando falta', () => {
      const { data, conflict } = applyTenantToData({ name: 'Café' }, ORG);
      expect(conflict).toBeNull();
      expect(data).toEqual({ name: 'Café', organizationId: ORG });
    });

    it('deja pasar la organización propia', () => {
      const { conflict } = applyTenantToData(
        { name: 'Café', organizationId: ORG },
        ORG,
      );
      expect(conflict).toBeNull();
    });

    it('señala la organización ajena en vez de sobrescribirla en silencio', () => {
      // Escribir en la organización de otro es el vector que se demostró en
      // vivo con crm/campaigns: tiene que ser un error, no una corrección muda.
      const { conflict } = applyTenantToData(
        { name: 'Café', organizationId: OTHER },
        ORG,
      );
      expect(conflict).toBe(OTHER);
    });

    it('respeta la relación connect en vez de duplicar el escalar', () => {
      // Poner organizationId junto a `organization: { connect }` hace que
      // Prisma rechace la consulta por definir la relación dos veces.
      const input = { name: 'Café', organization: { connect: { id: ORG } } };
      const { data } = applyTenantToData(input, ORG);
      expect(data).toEqual(input);
    });

    it('aplica a cada fila de un createMany', () => {
      const { data } = applyTenantToData([{ name: 'a' }, { name: 'b' }], ORG);
      expect(data).toEqual([
        { name: 'a', organizationId: ORG },
        { name: 'b', organizationId: ORG },
      ]);
    });

    it('señala el conflicto si CUALQUIER fila de un createMany es ajena', () => {
      const { conflict } = applyTenantToData(
        [{ name: 'a' }, { name: 'b', organizationId: OTHER }],
        ORG,
      );
      expect(conflict).toBe(OTHER);
    });
  });

  describe('cobertura del catálogo', () => {
    it('declara los 32 modelos que tienen organizationId', () => {
      // Si alguien añade un modelo con organizationId y no lo declara aquí,
      // queda sin acotar en silencio. Este número es el recordatorio.
      expect(Object.keys(MODEL_POLICIES)).toHaveLength(32);
    });

    it('no deja ningún modelo declarado como exento por descuido', () => {
      // Exento se expresa NO declarando el modelo. Declararlo como exento
      // sería ambiguo: no se sabría si es decisión o error.
      expect(
        Object.values(MODEL_POLICIES).filter((p) => p === 'exempt'),
      ).toHaveLength(0);
    });
  });
});
