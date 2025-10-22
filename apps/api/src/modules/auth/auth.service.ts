import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Registrar nuevo usuario
   */
  async register(registerDto: RegisterDto) {
    // Verificar si el email ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
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
        name: registerDto.name,
        organizationId: registerDto.organizationId,
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        organizationId: true,
        createdAt: true,
      },
    });

    this.logger.log(`User registered: ${user.email}`);

    // Generar tokens
    const tokens = await this.generateTokens(user.id, user.email, user.organizationId);

    return {
      user,
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
        name: true,
        password: true,
        organizationId: true,
        active: true,
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

    // Generar tokens
    const tokens = await this.generateTokens(user.id, user.email, user.organizationId);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
      },
      ...tokens,
    };
  }

  /**
   * Refrescar access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          organizationId: true,
          active: true,
        },
      });

      if (!user || !user.active) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.organizationId);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
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

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      this.saltRounds,
    );

    // Actualizar contraseña
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
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
        name: true,
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
   * Generar access y refresh tokens
   */
  private async generateTokens(userId: string, email: string, organizationId?: string) {
    const payload = {
      sub: userId,
      email,
      organizationId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '7d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60, // 7 días en segundos
    };
  }
}
