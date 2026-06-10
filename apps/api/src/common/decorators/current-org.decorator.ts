import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Decorador que extrae el `organizationId` del usuario autenticado en el request.
 *
 * Requiere que la ruta esté protegida por `JwtAuthGuard` (es global por defecto).
 * Si el usuario no tiene `organizationId` (p.ej. super admin sin contexto) lanza
 * `UnauthorizedException` para evitar fugas multi-tenant accidentales.
 *
 * Uso:
 * ```ts
 * @Get()
 * findAll(@CurrentOrg() organizationId: string) {
 *   return this.service.findAll(organizationId);
 * }
 * ```
 */
export const CurrentOrg = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('No authenticated user in request');
    }

    if (!user.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }

    return user.organizationId as string;
  },
);
