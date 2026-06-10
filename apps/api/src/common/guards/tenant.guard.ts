import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Guard que valida que el `organizationId` presente en el cuerpo o query del
 * request coincide con el `organizationId` del JWT del usuario.
 *
 * Uso:
 * ```ts
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * @Post()
 * create(@Body() dto: CreateXDto) { ... }
 * ```
 *
 * Para endpoints donde el `organizationId` viene en path params se debe
 * extender este guard o validar manualmente en el service.
 *
 * Reglas:
 *  - Si no hay usuario autenticado, lanza `UnauthorizedException`.
 *  - Si el body/query trae `organizationId` que no matchea al del JWT,
 *    lanza `ForbiddenException` (cross-tenant attempt).
 *  - Si no se envía `organizationId` en el body/query, el guard pasa sin
 *    tocar el request (se asume que el controller usa `@CurrentOrg()`).
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('No authenticated user');
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

    const candidates = [fromBody, fromQuery].filter(
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
