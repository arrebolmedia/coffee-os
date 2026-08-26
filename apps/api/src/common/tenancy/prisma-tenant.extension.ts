import { Prisma, PrismaClient } from '@prisma/client';
import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { getTenantContext } from './tenant-context';
import {
  applyTenantToData,
  CREATE_OPERATIONS,
  FILTERABLE_OPERATIONS,
  mergeWhere,
  policyFor,
  rowBelongsToTenant,
  tenantFilter,
  UNIQUE_WHERE_OPERATIONS,
} from './tenant-scope';

const logger = new Logger('TenantScope');

/**
 * Extensión de Prisma Client que inyecta el filtro de organización en toda
 * consulta sobre un modelo multi-tenant.
 *
 * Existe porque quedaban ~89 lookups sin filtro repartidos por el backend, y
 * arreglarlos uno a uno no impide el número 90: el fallo por defecto era el
 * silencio. Aquí el default se invierte — un endpoint nuevo escrito sin pensar
 * en tenancy queda acotado, y lo que legítimamente cruza organizaciones tiene
 * que declararlo con `runUnscoped()`.
 *
 * `base` es el cliente **sin extender**: se usa para comprobar la pertenencia
 * antes de un update/delete. Consultarlo a través del cliente extendido
 * provocaría recursión infinita.
 */
export function createTenantExtension(base: PrismaClient) {
  return Prisma.defineExtension({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const ctx = getTenantContext();
          const organizationId = ctx?.organizationId ?? null;

          // Sin organización en el contexto no se inyecta nada. Cubre las rutas
          // @Public() (login, health, alta de organización), los scripts y los
          // bloques marcados con runUnscoped(). No es un agujero silencioso: es
          // la ausencia de un usuario autenticado del que derivar la
          // organización.
          if (!organizationId) return query(args);

          // El super admin cruza organizaciones por diseño.
          if (ctx?.isSuperAdmin) return query(args);

          const policy = policyFor(model);
          if (policy === 'exempt') return query(args);

          const filter = tenantFilter(policy, organizationId);
          if (!filter) return query(args);

          const params = (args ?? {}) as Record<string, unknown>;

          if (FILTERABLE_OPERATIONS.has(operation)) {
            return query({
              ...params,
              where: mergeWhere(params.where, filter),
            });
          }

          if (CREATE_OPERATIONS.has(operation)) {
            const { data, conflict } = applyTenantToData(
              params.data,
              organizationId,
            );
            if (conflict) {
              logger.warn(
                `Intento de crear ${model} en la organización ${conflict} desde la ${organizationId}`,
              );
              throw new ForbiddenException(
                `No se puede crear ${model} en otra organización`,
              );
            }
            return query({ ...params, data });
          }

          if (UNIQUE_WHERE_OPERATIONS.has(operation)) {
            // El `where` de estas operaciones tiene que ser único: Prisma
            // rechaza que se le añada `organizationId`. La pertenencia se
            // comprueba aparte.
            if (
              operation === 'findUnique' ||
              operation === 'findUniqueOrThrow'
            ) {
              // Lectura: se lee y se descarta lo ajeno. Una fila de otra
              // organización queda indistinguible de una inexistente.
              const row = await query(args);
              if (!rowBelongsToTenant(row, policy, organizationId)) {
                if (operation === 'findUniqueOrThrow') {
                  throw new NotFoundException(`${model} no encontrado`);
                }
                return null;
              }
              return row;
            }

            // Escritura: hay que comprobar ANTES, porque después ya se mutó.
            await assertOwnership(
              base,
              model,
              params.where,
              policy,
              organizationId,
            );

            if (operation === 'upsert') {
              const { data, conflict } = applyTenantToData(
                params.create,
                organizationId,
              );
              if (conflict) {
                throw new ForbiddenException(
                  `No se puede crear ${model} en otra organización`,
                );
              }
              // Los args de una extensión son dinámicos por naturaleza: el
              // tipo concreto depende del modelo, que aquí no se conoce.
              return query({ ...params, create: data } as typeof args);
            }

            return query(args);
          }

          return query(args);
        },
      },
    },
  });
}

/**
 * Comprueba que la fila que se va a mutar es de la organización.
 *
 * Cuesta una consulta extra por update/delete. Es el precio de conservar la
 * semántica exacta de Prisma: convertir el `update` en `updateMany` para poder
 * filtrar cambiaría la forma del resultado y rompería a todos los que lo
 * consumen.
 *
 * Una fila inexistente se deja pasar para que sea Prisma quien lance su propio
 * error (P2025), en vez de inventar aquí uno distinto.
 */
async function assertOwnership(
  base: PrismaClient,
  model: string,
  where: unknown,
  policy: ReturnType<typeof policyFor>,
  organizationId: string,
): Promise<void> {
  if (!where || typeof where !== 'object') return;

  const delegate = (base as unknown as Record<string, any>)[lowerFirst(model)];
  if (!delegate?.findFirst) return;

  const existing = await delegate.findFirst({
    where,
    select: { organizationId: true },
  });

  if (!existing) return;

  if (!rowBelongsToTenant(existing, policy, organizationId)) {
    logger.warn(
      `Intento de mutar ${model} de otra organización desde ${organizationId}`,
    );
    throw new NotFoundException(`${model} no encontrado`);
  }

  // El catálogo global es de lectura para el tenant: dejar que lo edite sería
  // que una organización cambiara los roles de sistema de todas las demás.
  if (
    policy === 'shared-global' &&
    (existing as { organizationId: string | null }).organizationId === null
  ) {
    throw new ForbiddenException(
      `${model} global: no se puede modificar desde una organización`,
    );
  }
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}
