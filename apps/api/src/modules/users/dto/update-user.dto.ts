import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * UpdateUserDto deliberately does NOT include `password`.
 * Password changes must go through a dedicated /change-password endpoint
 * with old-password verification. Any `password` field sent here is silently
 * ignored by the controller/service.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  role_id?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsBoolean()
  is_super_admin?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
