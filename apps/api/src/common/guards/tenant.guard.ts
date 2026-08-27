import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../modules/auth/decorators/public.decorator';

/**
 * Guard global que valida que el `organizationId` presente en el cuerpo o query
 * del request coincide con el `organizationId` del JWT del usuario.
 *
 * Está registrado como `APP_GUARD` en `AppModule`, **después** de `JwtAuthGuard`
 * (el orden importa: necesita `request.user` ya poblado).
 *
 * Reglas:
 *  - Rutas marcadas con `@Public()` pasan sin validar (login, registro, health).
 *  - Si no hay usuario autenticado, lanza `UnauthorizedException`.
 *  - Los super admin pasan: cruzar organizaciones es justamente su función.
 *  - Si el body, query o path params traen una organización que no matchea a la
 *    del JWT, lanza `ForbiddenException` (intento cross-tenant). Se reconoce
 *    cualquier forma del nombre (`organizationId`, `organization_id`, `orgId`),
 *    no una lista cerrada.
 *  - Si no se envía `organizationId`, el guard pasa sin tocar el request. El
 *    controller DEBE usar `@CurrentOrg()` para derivarlo del JWT — omitir el
 *    parámetro no puede significar "sin filtro".
 *
 * Este guard cierra el vector de *mismatch explícito*. No cierra por sí solo:
 *  - la enumeración (omitir el parámetro) → se resuelve usando `@CurrentOrg()`;
 *  - el IDOR sobre rutas `:id` → el service debe verificar la pertenencia del
 *    registro, porque ahí la organización no viaja en el request.
 */
/**
 * Si una clave nombra a la organización, se escriba como se escriba.
 *
 * Se normaliza quitando todo lo que no sea una letra, de modo que
 * `organizationId`, `organization_id`, `organisation-id` y `orgId` caen en el
 * mismo sitio. Una lista de nombres exactos se queda corta en cuanto alguien
 * escribe el parámetro de otra manera, que es justo lo que había pasado.
 */
function nombraLaOrganizacion(clave: string): boolean {
  const normal = clave.toLowerCase().replace(/[^a-z]/g, '');
  return (
    normal === 'organizationid' ||
    normal === 'organisationid' ||
    normal === 'orgid'
  );
}

/** Los valores de un objeto de request cuyas claves nombran la organización. */
function valoresDeOrganizacion(fuente: unknown): string[] {
  if (!fuente || typeof fuente !== 'object' || Array.isArray(fuente)) return [];

  return Object.entries(fuente as Record<string, unknown>)
    .filter(([clave]) => nombraLaOrganizacion(clave))
    .map(([, valor]) => valor)
    .filter(
      (valor): valor is string =>
        typeof valor === 'string' && valor.trim() !== '',
    );
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('No authenticated user');
    }

    // Los super admin operan por encima de la frontera de organización.
    if (user.isSuperAdmin) {
      return true;
    }

    if (!user.organizationId) {
      throw new UnauthorizedException(
        'User does not belong to any organization',
      );
    }

    // Se recogen por forma del nombre y no por una lista de nombres exactos.
    // Buscar sólo `organizationId`/`organization_id` dejaba pasar las cinco
    // rutas del POS declaradas como `:orgId`: `GET /pos/stats/daily/:orgId` y
    // `GET /pos/orders/organization/:orgId/today` devolvían el corte de caja y
    // los tickets completos de cualquier otra organización, con 200. La misma
    // petición contra `/waste/stats/:organization_id` daba 403 — lo único que
    // las separaba era cómo se escribía el parámetro.
    const candidates = [request.body, request.query, request.params].flatMap(
      valoresDeOrganizacion,
    );

    for (const candidate of candidates) {
      if (candidate !== user.organizationId) {
        throw new ForbiddenException(
          'organizationId does not match authenticated user',
        );
      }
    }

    return true;
  }
}
