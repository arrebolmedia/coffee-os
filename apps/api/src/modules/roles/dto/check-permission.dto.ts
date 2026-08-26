import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Action, Resource } from '../interfaces';

export class CheckPermissionDto {
  @IsString()
  user_id: string;

  /** Opcional: la organización efectiva sale del JWT (`@CurrentOrg()`). */
  @IsString()
  @IsOptional()
  organization_id?: string;

  @IsEnum(Resource)
  resource: Resource;

  @IsEnum(Action)
  action: Action;
}
