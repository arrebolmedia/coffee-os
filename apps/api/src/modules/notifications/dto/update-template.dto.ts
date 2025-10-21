import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { CreateTemplateDto } from './create-template.dto';

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {
  @IsUUID()
  @IsOptional()
  updated_by?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
