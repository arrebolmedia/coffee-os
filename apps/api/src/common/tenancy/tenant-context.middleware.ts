import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { runInTenantScope } from './tenant-context';

/**
 * Abre el contexto de organización al principio de cada petición.
 *
 * Tiene que ser middleware y no interceptor: en NestJS el orden es
 * middleware → guards → interceptores → handler, y `JwtAuthGuard` consulta la
 * base antes de que corra ningún interceptor. Si el scope se abriera en un
 * interceptor, las consultas del propio guard quedarían fuera.
 *
 * El contexto se abre vacío; lo rellena `JwtStrategy.validate` en cuanto sabe a
 * qué organización pertenece el usuario.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction) {
    runInTenantScope(() => next());
  }
}
