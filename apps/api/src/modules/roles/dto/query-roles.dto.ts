import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsString,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Resource, Action, SystemRole } from '../interfaces';

export class QueryPermissionsDto {
  @IsUUID()
  @IsOptional()
  organization_id?: string;

  @IsEnum(Resource)
  @IsOptional()
  resource?: Resource;

  @IsEnum(Action)
  @IsOptional()
  action?: Action;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sort_by?: string = 'name';

  @IsIn(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc' = 'asc';
}

export class QueryRolesDto {
  @IsUUID()
  @IsOptional()
  organization_id?: string;

  @IsEnum(SystemRole)
  @IsOptional()
  system_role?: SystemRole;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sort_by?: string = 'name';

  @IsIn(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc' = 'asc';
}

export class QueryUserRolesDto {
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @IsUUID()
  @IsOptional()
  role_id?: string;

  @IsUUID()
  @IsOptional()
  organization_id?: string;

  @IsUUID()
  @IsOptional()
  location_id?: string;
}
