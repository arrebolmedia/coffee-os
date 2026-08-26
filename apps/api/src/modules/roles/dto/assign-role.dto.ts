import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignRoleDto {
  @IsString()
  user_id: string;

  @IsString()
  role_id: string;

  /**
   * Opcional y sólo por compatibilidad: la organización se toma del JWT
   * (`@CurrentOrg()`). Si viene, el `TenantGuard` global exige que coincida.
   */
  @IsString()
  @IsOptional()
  organization_id?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  location_ids?: string[];

  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  valid_from?: Date;

  @IsDateString()
  @IsOptional()
  @Type(() => Date)
  valid_until?: Date;

  /**
   * Ignorado: el autor de la asignación se toma del usuario autenticado para
   * que la auditoría no sea falsificable desde el cliente.
   */
  @IsString()
  @IsOptional()
  assigned_by?: string;
}
