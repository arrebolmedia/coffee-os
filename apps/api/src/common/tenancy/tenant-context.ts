import { AsyncLocalStorage } from 'async_hooks';

/**
 * Contexto de organización de la petición en curso.
 *
 * Es un objeto **mutable** a propósito. El scope de AsyncLocalStorage se abre en
 * un middleware, que corre antes que los guards; la organización sólo se conoce
 * más tarde, cuando `JwtStrategy.validate` carga al usuario. Abrir el scope con
 * un objeto vacío y rellenarlo después evita decodificar el JWT dos veces, y
 * hace que todo lo que ocurre desde ese momento —guards, interceptores, handler,
 * servicios— comparta el mismo contexto.
 */
export interface TenantContext {
  organizationId: string | null;
  isSuperAdmin: boolean;
}

const storage = new AsyncLocalStorage<TenantContext>();

/** Abre el contexto de la petición. Lo llama el middleware, una vez por request. */
export function runInTenantScope<T>(fn: () => T): T {
  return storage.run({ organizationId: null, isSuperAdmin: false }, fn);
}

/**
 * Rellena el contexto ya abierto. Lo llama `JwtStrategy.validate` en cuanto sabe
 * a qué organización pertenece el usuario.
 */
export function setTenantContext(ctx: Partial<TenantContext>): void {
  const store = storage.getStore();
  if (!store) return;
  if (ctx.organizationId !== undefined) {
    store.organizationId = ctx.organizationId;
  }
  if (ctx.isSuperAdmin !== undefined) store.isSuperAdmin = ctx.isSuperAdmin;
}

export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

/**
 * Vía de escape **explícita**: ejecuta `fn` sin filtro de organización.
 *
 * Existe para lo que es legítimamente global y debe quedar declarado en el
 * código, no ser el silencio por defecto:
 *
 *  - autenticación: buscar al usuario por el `sub` del JWT o por email al hacer
 *    login, que ocurre antes de saber a qué organización pertenece;
 *  - comprobaciones de unicidad global (email de usuario, slug de organización);
 *  - trabajos de mantenimiento que cruzan organizaciones a propósito.
 *
 * Cada uso es una excepción que alguien tuvo que escribir y que se localiza con
 * un grep.
 *
 * Abre un scope anidado en vez de mutar el store y restaurarlo a mano: con una
 * función async, restaurar en un `finally` síncrono devolvería el contexto antes
 * de que terminaran los `await` de dentro.
 *
 * Y es `async`, esperando a `fn` DENTRO del scope, también a propósito. Prisma
 * devuelve `PrismaPromise`s perezosas: la consulta no se ejecuta al construirla
 * sino al esperarla. Con una versión síncrona, el idioma natural
 *
 *     await runUnscoped(() => prisma.user.findUnique(...))
 *
 * construiría la promesa dentro del scope y la ejecutaría fuera — la vía de
 * escape no escaparía de nada, y en silencio. Costó encontrarlo una vez.
 */
export async function runUnscoped<T>(fn: () => T | Promise<T>): Promise<T> {
  const store = storage.getStore();
  return storage.run(
    { organizationId: null, isSuperAdmin: store?.isSuperAdmin ?? false },
    async () => await fn(),
  );
}
