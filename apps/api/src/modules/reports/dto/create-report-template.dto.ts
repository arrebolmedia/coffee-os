import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  ReportCategory,
  ReportParameters,
  ReportType,
} from '../interfaces/report.interface';

export class CreateReportTemplateDto {
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

  @IsObject()
  parameters: ReportParameters;

  @IsOptional()
  @IsEnum(['portrait', 'landscape'])
  layout?: 'portrait' | 'landscape';

  @IsOptional()
  @IsString()
  header_template?: string;

  @IsOptional()
  @IsString()
  footer_template?: string;

  @IsOptional()
  @IsObject()
  styles?: Record<string, any>;

  @IsBoolean()
  is_public: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowed_roles?: string[];

  @IsUUID()
  created_by: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
