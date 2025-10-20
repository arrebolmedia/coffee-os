import { IsOptional, IsString, IsBoolean, IsNumber, IsEnum, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ModifierType } from './create-modifier.dto';

export class QueryModifiersDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  skip?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  take?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsEnum(ModifierType)
  type?: ModifierType;

  @IsOptional()
  @IsString()
  search?: string;
}
