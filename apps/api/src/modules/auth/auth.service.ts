import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  RegisterOrganizationDto,
} from './dto/auth.dto';
import { parseJwtTtl } from './jwt-ttl';

const ACCESS_TOKEN_TTL = '15m';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL = '7d';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Registrar nuevo usuario dentro de una organización existente.
   * Sólo puede ser invocado por un usuario autenticado con rol owner/admin
   * (control de acceso enforced en el controller).
   */
  async register(
    registerDto: RegisterDto,
    actor: { userId: string; organizationId?: string; isSuperAdmin?: boolean },
  ) {
    // Validar que el actor sólo pueda crear usuarios dentro de su propia organización
    // (super-admins pueden crear en cualquier organización).
    if (
      !actor.isSuperAdmin &&
      actor.organizationId !== registerDto.organizationId
    ) {
      throw new UnauthorizedException(
        'Cannot register users in a different organization',
      );
    }

    // Verificar si el email ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // El rol debe ser visible para la organización del usuario que se crea:
    // o es del catálogo global del sistema (organizationId null) o le
    // pertenece. Con findUnique bastaba el id, así que se podía enlazar un
    // usuario propio a un rol de OTRA organización — mismo predicado que
    // `visibleRoles()` en roles.service y que hr/employees.service.
    const role = await this.prisma.role.findFirst({
      where: {
        id: registerDto.roleId,
        OR: [
          { organizationId: registerDto.organizationId },
          { organizationId: null },
        ],
      },
      select: { id: true },
    });
    if (!role) {
      throw new BadRequestException('Invalid roleId');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.saltRounds,
    );

    // Crear usuario
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        firstName: registerDto.firstName || '',
        lastName: registerDto.lastName || '',
        organizationId: registerDto.organizationId,
        roleId: registerDto.roleId,
        active: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
        createdAt: true,
      },
    });

    this.logger.log(`User registered: ${user.email} (by ${actor.userId})`);

    // Generar tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.organizationId,
    );

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Self-registration de una nueva organización: crea Organization + primer admin
   * atómicamente. NO permite setear roleId arbitrario desde el DTO.
   */
  async registerOrganization(dto: RegisterOrganizationDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Buscar (o exigir) el rol "owner" que viene en seeds. Vive en el catálogo
    // global (`organizationId: null`), que es el que comparten todos los
    // tenants; `name` dejó de ser único globalmente al hacerse por organización.
    const ownerRole = await this.prisma.role.findFirst({
      where: { name: 'owner', organizationId: null },
    });
    if (!ownerRole) {
      throw new BadRequestException(
        'Owner role not found. Please run database seed first.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

    // Crear org + user en una transacción para garantizar atomicidad.
    let result: {
      user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        organizationId: string;
        createdAt: Date;
      };
      org: { id: string; name: string; slug: string };
    };
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: dto.organizationName,
            slug: dto.organizationSlug,
          },
          select: { id: true, name: true, slug: true },
        });

        const user = await tx.user.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            firstName: dto.firstName || '',
            lastName: dto.lastName || '',
            organizationId: org.id,
            roleId: ownerRole.id,
            active: true,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            organizationId: true,
            createdAt: true,
          },
        });

        return { user, org };
      });
    } catch (error) {
      // P2002 = unique constraint violation (org slug or user email raced in).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = error.meta?.target;
        const targetStr = Array.isArray(target)
          ? target.join(',')
          : String(target ?? '');
        if (targetStr.includes('email')) {
          throw new ConflictException('Email already registered');
        }
        throw new ConflictException('Slug already in use');
      }
      throw error;
    }

    this.logger.log(
      `Organization registered: ${result.org.slug} (admin: ${result.user.email})`,
    );

    const tokens = await this.generateTokens(
      result.user.id,
      result.user.email,
      result.user.organizationId,
    );

    return {
      user: result.user,
      organization: result.org,
      ...tokens,
    };
  }

  /**
   * Login de usuario
   */
  async login(loginDto: LoginDto) {
    // Buscar usuario
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        password: true,
        organizationId: true,
        roleId: true,
        isSuperAdmin: true,
        active: true,
        role: {
          select: {
            name: true,
          },
        },
        locations: {
          select: {
            locationId: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verificar si está activo
    if (!user.active) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in: ${user.email}`);

    // Determinar primer locationId asociado al usuario (o null si no tiene).
    const primaryLocationId =
      user.locations && user.locations.length > 0
        ? user.locations[0].locationId
        : null;

    // Generar tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.organizationId,
      user.isSuperAdmin,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        role: user.role?.name || 'USER',
        organizationId: user.organizationId,
        locationId: primaryLocationId,
        locationIds: user.locations?.map((l) => l.locationId) ?? [],
        isSuperAdmin: user.isSuperAdmin,
      },
      ...tokens,
    };
  }

  /**
   * Refrescar access token usando JWT_REFRESH_SECRET y validando type=refresh.
   * Re-lanza errores que no sean JsonWebTokenError/TokenExpiredError para
   * no enmascarar fallas de infraestructura (DB caída, etc.).
   */
  async refreshToken(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch (error) {
      if (
        error instanceof JsonWebTokenError ||
        error instanceof TokenExpiredError
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      throw error;
    }

    if (payload?.type !== 'refresh') {
      // Access tokens NO deben servir como refresh
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        organizationId: true,
        isSuperAdmin: true,
        active: true,
      },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateTokens(
      user.id,
      user.email,
      user.organizationId,
      user.isSuperAdmin,
    );
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Cambiarla por la misma no la cambia: dejaría al empleado con la
    // credencial que el dueño ya conoce, pero con el bloqueo levantado.
    if (changePasswordDto.newPassword === changePasswordDto.currentPassword) {
      throw new BadRequestException(
        'La contraseña nueva tiene que ser distinta de la actual',
      );
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      this.saltRounds,
    );

    // Actualizar contraseña. Y levantar el bloqueo: si la sesión estaba
    // limitada a esto —porque la contraseña se la habían dictado— cambiarla es
    // exactamente lo que la desbloquea.
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    this.logger.log(`Password changed for user: ${user.email}`);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  /**
   * Validar usuario (usado por JWT strategy)
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
        active: true,
      },
    });

    if (!user || !user.active) {
      return null;
    }

    return user;
  }

  /**
   * Generar access (15m) y refresh (7d) tokens. Refresh usa un secret
   * separado y un campo type:'refresh' para no ser confundible con un
   * access token.
   */
  private async generateTokens(
    userId: string,
    email: string,
    organizationId?: string,
    isSuperAdmin?: boolean,
  ) {
    const basePayload = {
      sub: userId,
      email,
      organizationId,
      isSuperAdmin: isSuperAdmin || false,
    };

    const accessToken = this.jwtService.sign(
      { ...basePayload, type: 'access' },
      {
        expiresIn: parseJwtTtl(
          this.configService.get<string>('JWT_EXPIRES_IN'),
          ACCESS_TOKEN_TTL,
          'JWT_EXPIRES_IN',
        ),
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...basePayload, type: 'refresh', jti: randomUUID() },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: parseJwtTtl(
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
          REFRESH_TOKEN_TTL,
          'JWT_REFRESH_EXPIRES_IN',
        ),
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }
}
