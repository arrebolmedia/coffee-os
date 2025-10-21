import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';
import {
  ReportCategory,
  ReportType,
  ExportFormat,
  ReportParameters,
} from '../interfaces/report.interface';

export class GenerateReportDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(ReportCategory)
  category: ReportCategory;

  @IsEnum(ReportType)
  type: ReportType;

  @IsOptional()
  @IsUUID()
  template_id?: string;

  @IsObject()
  parameters: ReportParameters;

  @IsOptional()
  @IsEnum(ExportFormat)
  export_format?: ExportFormat;

  @IsUUID()
  requested_by: string;
}
