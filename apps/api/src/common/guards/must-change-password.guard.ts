import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../modules/auth/decorators/public.decorator';

/**
 * Mientras un empleado no cambie la contraseña que le dictaron, su sesión sólo
 * sirve para cambiarla.
 *
 * El alta genera una contraseña temporal y el dueño se la entrega en voz alta o
 * en un papel; el mismo caso se repite cada vez que se repone una olvidada. En
 * ese hueco la credencial la conocen dos personas, y con ella se puede cobrar,
 * hacer un corte de caja o borrar productos. Esto cierra el hueco: hasta que la
 * cambie, todo lo demás responde 403.
 *
 * La marca se lee de la base en cada petición (la estrategia JWT ya trae al
 * usuario), no del token, así que el bloqueo se levanta en el instante en que la
 * cambia y no hace falta reemitirle nada.
 *
 * Va DESPUÉS de `JwtAuthGuard` en la lista de `APP_GUARD`: necesita
 * `request.user` ya poblado.
 */
@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  /**
   * Lo único que se puede hacer con la sesión bloqueada.
   *
   * `change-password` es la salida. `logout` y `me` están porque la interfaz
   * necesita poder cerrar sesión y saber quién es sin quedarse en un callejón.
   */
  private static readonly PERMITIDAS = [
    'POST /api/v1/auth/change-password',
    'POST /api/v1/auth/logout',
    'GET /api/v1/auth/me',
  ];

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.mustChangePassword) return true;

    const ruta = `${request.method} ${(request.route?.path ?? request.url).split('?')[0]}`;
    if (MustChangePasswordGuard.PERMITIDAS.includes(ruta)) return true;

    throw new ForbiddenException({
      statusCode: 403,
      // Un código estable para que la interfaz sepa a dónde mandar al usuario
      // en vez de tener que adivinarlo del texto del mensaje.
      error: 'MUST_CHANGE_PASSWORD',
      message:
        'Tienes que cambiar la contraseña que te dieron antes de usar el sistema.',
    });
  }
}
