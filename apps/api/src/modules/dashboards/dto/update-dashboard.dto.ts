import { PartialType } from '@nestjs/mapped-types';
import { CreateDashboardDto } from './create-dashboard.dto';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdateDashboardDto extends PartialType(CreateDashboardDto) {
  @IsUUID()
  @IsOptional()
  updated_by?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
