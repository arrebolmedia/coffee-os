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
 *  - Si el body, query o path params traen un `organizationId` que no matchea
 *    al del JWT, lanza `ForbiddenException` (intento cross-tenant).
 *  - Si no se envía `organizationId`, el guard pasa sin tocar el request. El
 *    controller DEBE usar `@CurrentOrg()` para derivarlo del JWT — omitir el
 *    parámetro no puede significar "sin filtro".
 *
 * Este guard cierra el vector de *mismatch explícito*. No cierra por sí solo:
 *  - la enumeración (omitir el parámetro) → se resuelve usando `@CurrentOrg()`;
 *  - el IDOR sobre rutas `:id` → el service debe verificar la pertenencia del
 *    registro, porque ahí la organización no viaja en el request.
 */
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

    const fromBody =
      request.body?.organizationId ?? request.body?.organization_id;
    const fromQuery =
      request.query?.organizationId ?? request.query?.organization_id;
    // Varias rutas llevan la organización en el path (p. ej.
    // `GET /waste/stats/:organization_id`). Sin esto quedaría abierta la fuga
    // justo en los endpoints de estadísticas agregadas.
    const fromParams =
      request.params?.organizationId ?? request.params?.organization_id;

    const candidates = [fromBody, fromQuery, fromParams].filter(
      (v) => v !== undefined && v !== null && v !== '',
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
