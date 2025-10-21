import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateSettingDto } from './create-setting.dto';

export class UpdateSettingDto extends PartialType(
  OmitType(CreateSettingDto, ['organization_id', 'category', 'key'] as const),
) {}
