import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  runUnscoped,
  setTenantContext,
} from '../../../common/tenancy/tenant-context';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  organizationId?: string;
  role?: string;
  isSuperAdmin?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Verificar que el usuario existe en la base de datos
    // Excepción declarada: se busca al usuario por el `sub` del JWT, que es
    // precisamente lo que aún no sabemos a qué organización pertenece. Es el
    // arranque del contexto, no puede estar acotado por él.
    const user = await runUnscoped(() =>
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          active: true,
          organizationId: true,
          isSuperAdmin: true,
        },
      }),
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.active) {
      throw new UnauthorizedException('User account is disabled');
    }

    // A partir de aquí toda consulta de esta petición queda acotada sola: el
    // scope lo abrió el middleware y aquí se rellena con la organización real.
    setTenantContext({
      organizationId: user.organizationId,
      isSuperAdmin: user.isSuperAdmin ?? false,
    });

    // Retornar el usuario para que esté disponible en el request
    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      isSuperAdmin: user.isSuperAdmin,
    };
  }
}
