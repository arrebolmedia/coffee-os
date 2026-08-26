import { IsArray, IsDate, IsOptional, IsString } from 'class-validator';
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

  /**
   * `@Type(() => Date)` convierte el ISO entrante en Date ANTES de validar, asi
   * que el `@IsDateString()` que habia aqui lo rechazaba por no ser un string:
   * las asignaciones temporales devolvian 400 con cualquier fecha valida y eran
   * inalcanzables por HTTP. El servicio necesita un Date -va directo a Prisma-,
   * de modo que la pareja correcta es @IsDate + @Type.
   */
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  valid_from?: Date;

  @IsDate()
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
