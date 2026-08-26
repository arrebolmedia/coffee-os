import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Action, Resource, SystemRole } from '../interfaces';

/**
 * Los ids del sistema son cuid, no uuid — por eso los filtros usan `@IsString`.
 * `organization_id` es opcional en todos los queries: el filtro efectivo sale
 * del JWT (`@CurrentOrg()`), y si el cliente lo manda el `TenantGuard` global
 * exige que coincida.
 */
export class QueryPermissionsDto {
  @IsString()
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
  @IsString()
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
  @IsString()
  @IsOptional()
  user_id?: string;

  @IsString()
  @IsOptional()
  role_id?: string;

  @IsString()
  @IsOptional()
  organization_id?: string;

  @IsString()
  @IsOptional()
  location_id?: string;
}
