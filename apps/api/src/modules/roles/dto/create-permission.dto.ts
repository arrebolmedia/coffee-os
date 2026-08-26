import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Action, Effect, Resource } from '../interfaces';

export class CreatePermissionDto {
  /**
   * Opcional y sólo por compatibilidad: el permiso se crea siempre en la
   * organización del JWT (`@CurrentOrg()`).
   */
  @IsString()
  @IsOptional()
  organization_id?: string;

  @IsEnum(Resource)
  resource: Resource;

  @IsEnum(Action)
  action: Action;

  @IsEnum(Effect)
  @IsOptional()
  effect?: Effect = Effect.ALLOW;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;
}
