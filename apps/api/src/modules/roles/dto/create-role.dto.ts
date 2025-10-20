import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  MaxLength,
  Matches,
} from 'class-validator';
import { SystemRole } from '../interfaces';

export class CreateRoleDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code must contain only uppercase letters, numbers, and underscores',
  })
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_system?: boolean = false;

  @IsEnum(SystemRole)
  @IsOptional()
  system_role?: SystemRole;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  permission_ids?: string[] = [];

  @IsString()
  @MaxLength(20)
  @IsOptional()
  color?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  icon?: string;
}
