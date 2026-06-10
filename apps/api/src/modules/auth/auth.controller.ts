import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import {
  ChangePasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  RegisterOrganizationDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import {
  CurrentUser,
  CurrentUserType,
} from './decorators/current-user.decorator';

// Nombres de rol permitidos para registrar usuarios dentro de una organización.
const ROLES_THAT_CAN_REGISTER = new Set(['owner', 'admin']);

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Registrar nuevo usuario dentro de una organización existente.
   * Requiere JWT con rol owner/admin (o super-admin).
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user inside an existing organization',
  })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden: insufficient role' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @CurrentUser() actor: CurrentUserType,
    @Body() registerDto: RegisterDto,
  ) {
    // Resolver el rol del actor — sólo owner/admin (o super-admin) pueden registrar.
    if (!actor.isSuperAdmin) {
      const me = await this.prisma.user.findUnique({
        where: { id: actor.userId },
        select: { role: { select: { name: true } } },
      });
      const roleName = me?.role?.name?.toLowerCase();
      if (!roleName || !ROLES_THAT_CAN_REGISTER.has(roleName)) {
        throw new ForbiddenException(
          'Only owner/admin users can register new users',
        );
      }
    }

    return this.authService.register(registerDto, {
      userId: actor.userId,
      organizationId: actor.organizationId,
      isSuperAdmin: actor.isSuperAdmin,
    });
  }

  /**
   * Self-registration de una nueva organización + primer admin (owner).
   * Público porque es el punto de entrada para nuevos clientes; el rol
   * del usuario creado SIEMPRE será 'owner' (no se acepta roleId del DTO).
   */
  @Public()
  @Post('register-organization')
  @ApiOperation({
    summary: 'Self-register a new organization and its first owner user',
  })
  @ApiResponse({
    status: 201,
    description: 'Organization and owner user created',
  })
  @ApiResponse({
    status: 409,
    description: 'Email or organization slug already exists',
  })
  async registerOrganization(@Body() dto: RegisterOrganizationDto) {
    return this.authService.registerOrganization(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @CurrentUser() user: CurrentUserType,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, changePasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user (client-side token removal)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout() {
    // En JWT, el logout es principalmente client-side (eliminar el token)
    // Aquí podríamos agregar el token a una blacklist si fuera necesario
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@CurrentUser() user: CurrentUserType) {
    return {
      success: true,
      data: user,
    };
  }
}
