import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsObject,
  MaxLength,
  Matches,
} from 'class-validator';
import { Resource, Action, Effect } from '../interfaces';

export class CreatePermissionDto {
  @IsUUID()
  organization_id: string;

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
