import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { SystemRole } from '../interfaces';

export class CreateRoleDto {
  /**
   * Opcional y sólo por compatibilidad: el rol se crea siempre en la
   * organización del JWT (`@CurrentOrg()`).
   */
  @IsString()
  @IsOptional()
  organization_id?: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'Code must contain only uppercase letters, numbers, and underscores',
  })
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  /**
   * Aceptados por compatibilidad pero **ignorados**: son banderas del servidor.
   *
   * Se escribian tal cual venian del cliente, asi que cualquiera podia crear un
   * rol con `is_system: true` — y despues ni updateRole ni deleteRole lo dejan
   * tocar ("Cannot update/delete a system role"). Era una forma de dejarse un
   * registro inmutable en la propia organizacion sin querer. Los roles de
   * sistema se siembran, no se crean por API.
   */
  @IsBoolean()
  @IsOptional()
  is_system?: boolean;

  @IsEnum(SystemRole)
  @IsOptional()
  system_role?: SystemRole;

  @IsArray()
  @IsString({ each: true })
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
