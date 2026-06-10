import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'admin@coffeeos.mx',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'Juan',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Pérez',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Organization ID',
    example: 'org_abc123',
  })
  @IsString()
  organizationId: string;

  @ApiProperty({
    description: 'Role ID',
    example: 'role_abc123',
  })
  @IsString()
  roleId: string;
}

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'admin@coffeeos.mx',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
  })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refreshToken: string;
}

export class RegisterOrganizationDto {
  @ApiProperty({
    description: 'Owner email address',
    example: 'admin@coffeeos.mx',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Owner password (minimum 8 characters)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Owner first name', example: 'Juan' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Owner last name', example: 'Pérez' })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Organization display name',
    example: 'Mi Cafetería',
  })
  @IsString()
  @MinLength(2)
  organizationName: string;

  @ApiProperty({
    description: 'Organization slug (URL-safe, unique)',
    example: 'mi-cafeteria',
  })
  @IsString()
  @MinLength(3)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'organizationSlug must be lowercase alphanumeric and hyphens only',
  })
  organizationSlug: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'OldPassword123!',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    example: 'NewPassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
