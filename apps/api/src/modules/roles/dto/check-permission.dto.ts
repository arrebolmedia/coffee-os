import { IsEnum, IsUUID } from 'class-validator';
import { Resource, Action } from '../interfaces';

export class CheckPermissionDto {
  @IsUUID()
  user_id: string;

  @IsUUID()
  organization_id: string;

  @IsEnum(Resource)
  resource: Resource;

  @IsEnum(Action)
  action: Action;
}
