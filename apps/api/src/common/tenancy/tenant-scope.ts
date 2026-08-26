/**
 * Política de aislamiento por modelo, y la reescritura de argumentos que la
 * aplica.
 *
 * Este archivo es lógica pura: no toca Prisma ni el contexto de la petición, y
 * está cubierto por tests unitarios. Es el único sitio que hay que auditar para
 * saber qué queda acotado y qué no — que es justo lo que faltaba cuando la
 * disciplina vivía repartida en ~25 servicios y bastaba olvidarse en uno.
 */

export type TenantPolicy =
  /** Filtrar siempre por `organizationId`. El caso normal. */
  | 'strict'
  /**
   * Filas del tenant **más** un catálogo global con `organizationId: null`
   * visible para todos. Filtrar con `=` a secas escondería el catálogo.
   */
  | 'shared-global'
  /** Nunca se filtra: no es dato de un tenant o su pertenencia se resuelve aparte. */
  | 'exempt';

/**
 * Los 31 modelos que declaran `organizationId`.
 *
 * Lo que NO está aquí no queda acotado por la extensión: modelos sin la columna
 * (`Order`, `Ticket`, `Shift`, `Payment`, `InventoryMovement`, que derivan la
 * organización de la sucursal, y las filas hijas que sólo son alcanzables a
 * través de su padre) siguen dependiendo del filtro que ponga el servicio. Ver
 * la nota al final del archivo.
 */
export const MODEL_POLICIES: Record<string, TenantPolicy> = {
  Asset: 'strict',
  Campaign: 'strict',
  CashRegister: 'strict',
  Category: 'strict',
  Customer: 'strict',
  Discount: 'strict',
  Expense: 'strict',
  Inventory: 'strict',
  InventoryItem: 'strict',
  Location: 'strict',
  LoyaltyReward: 'strict',
  LoyaltyTransaction: 'strict',
  MaintenanceRecord: 'strict',
  Notification: 'strict',
  NotificationBatch: 'strict',
  NotificationPreference: 'strict',
  NotificationTemplate: 'strict',
  // Permission y Role tienen `organizationId` NULLABLE: las filas con null son
  // el catálogo de sistema, compartido por todas las organizaciones. Filtrar con
  // `= org` dejaría a cada tenant sin ningún rol de sistema.
  Permission: 'shared-global',
  Role: 'shared-global',
  Permit: 'strict',
  Product: 'strict',
  PurchaseOrder: 'strict',
  Recipe: 'strict',
  Setting: 'strict',
  Supplier: 'strict',
  SustainabilityMetric: 'strict',
  SustainabilityTarget: 'strict',
  Tax: 'strict',
  User: 'strict',
  UserRoleAssignment: 'strict',
  WasteLog: 'strict',
};

export function policyFor(model: string | undefined): TenantPolicy {
  if (!model) return 'exempt';
  return MODEL_POLICIES[model] ?? 'exempt';
}

/** Operaciones cuyo `where` admite campos no únicos y se puede filtrar directo. */
export const FILTERABLE_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

/**
 * Operaciones que exigen un `where` **único**: no se les puede añadir
 * `organizationId`, Prisma lo rechaza. Se resuelven comprobando la pertenencia
 * aparte (antes de mutar, o descartando el resultado tras leer).
 */
export const UNIQUE_WHERE_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'update',
  'delete',
  'upsert',
]);

/** Operaciones que escriben filas nuevas y deben nacer con la organización puesta. */
export const CREATE_OPERATIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
]);

/**
 * El filtro que corresponde a cada política.
 *
 * `shared-global` devuelve un OR para que el catálogo compartido siga visible.
 */
export function tenantFilter(
  policy: TenantPolicy,
  organizationId: string,
): Record<string, unknown> | null {
  if (policy === 'strict') return { organizationId };
  if (policy === 'shared-global') {
    return { OR: [{ organizationId }, { organizationId: null }] };
  }
  return null;
}

/**
 * Combina el filtro de organización con el `where` que traía la consulta.
 *
 * Se usa `AND` en vez de mezclar las claves a pelo porque el `where` de la
 * llamada puede traer ya un `OR` propio: fusionarlos al mismo nivel dejaría que
 * ese OR se aplicara en paralelo al filtro de organización y lo anulara.
 */
export function mergeWhere(
  where: unknown,
  filter: Record<string, unknown>,
): Record<string, unknown> {
  if (!where || typeof where !== 'object' || Object.keys(where).length === 0) {
    return filter;
  }
  return { AND: [where as Record<string, unknown>, filter] };
}

/**
 * ¿La fila leída pertenece a la organización?
 *
 * Para las operaciones de `where` único la comprobación es posterior: se lee y
 * se descarta lo ajeno. Bajo `shared-global`, `organizationId: null` es el
 * catálogo compartido y sí es visible.
 */
export function rowBelongsToTenant(
  row: unknown,
  policy: TenantPolicy,
  organizationId: string,
): boolean {
  if (!row || typeof row !== 'object') return true;
  if (!('organizationId' in row)) return true;
  const rowOrg = (row as { organizationId: string | null }).organizationId;
  if (rowOrg === organizationId) return true;
  if (policy === 'shared-global' && rowOrg === null) return true;
  return false;
}

/**
 * Fuerza la organización en el `data` de un create.
 *
 * Si el `data` trae otra organización, no se sobrescribe en silencio: se
 * devuelve el conflicto para que la extensión lo convierta en error. Escribir en
 * la organización de otro es justo el vector que se demostró en vivo con
 * `campaigns` en agosto.
 */
export function applyTenantToData(
  data: unknown,
  organizationId: string,
): { data: unknown; conflict: string | null } {
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = applyTenantToData(item, organizationId);
      if (result.conflict) return { data, conflict: result.conflict };
    }
    return {
      data: data.map(
        (item) => applyTenantToData(item, organizationId).data as unknown,
      ),
      conflict: null,
    };
  }

  if (!data || typeof data !== 'object') return { data, conflict: null };

  const record = data as Record<string, unknown>;
  const existing = record.organizationId;

  if (typeof existing === 'string' && existing !== organizationId) {
    return { data, conflict: existing };
  }

  // Prisma admite escribir la relación (`organization: { connect: ... }`) en vez
  // del escalar. Si viene así, se respeta: sobreponerle el escalar haría que
  // Prisma rechace la consulta por definir la relación dos veces.
  if (record.organization !== undefined) return { data, conflict: null };

  return { data: { ...record, organizationId }, conflict: null };
}

/*
 * ---------------------------------------------------------------------------
 * Lo que esta extensión NO cubre, dicho explícitamente
 * ---------------------------------------------------------------------------
 *
 * 1. Modelos sin `organizationId`. `Order`, `Ticket`, `Shift`, `Payment` e
 *    `InventoryMovement` derivan la organización de `location`. La extensión no
 *    puede inyectar una columna que no existe; esos servicios siguen filtrando a
 *    mano (`location: { organizationId }`), y sus fugas se cerraron una por una.
 *
 * 2. `Modifier` no tiene organización en el schema: el catálogo es global de
 *    facto. Es fuga conocida y pendiente — necesita migración con backfill, no
 *    una regla aquí.
 *
 * 3. Consultas crudas (`$queryRaw`, `$executeRaw`). Las extensiones de modelo no
 *    las ven.
 *
 * 4. Peticiones sin usuario autenticado (rutas `@Public()`): no hay organización
 *    en el contexto, así que no se inyecta nada. Un endpoint público que exponga
 *    datos de tenant es un agujero que ninguna extensión puede tapar.
 *
 * 5. `isSuperAdmin`: cruza organizaciones por diseño y queda exento.
 */
