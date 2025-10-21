import { IsUUID, IsArray, IsBoolean, IsOptional } from 'class-validator';

export class ImportSettingsDto {
  @IsUUID()
  organization_id: string;

  @IsArray()
  settings: any[];

  @IsBoolean()
  @IsOptional()
  overwrite_existing?: boolean = false;

  @IsBoolean()
  @IsOptional()
  skip_readonly?: boolean = true;
}

export class ExportSettingsDto {
  @IsUUID()
  organization_id: string;

  @IsOptional()
  categories?: string[];

  @IsBoolean()
  @IsOptional()
  include_encrypted?: boolean = false;

  @IsBoolean()
  @IsOptional()
  include_readonly?: boolean = true;
}
