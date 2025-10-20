import { IsOptional, IsString, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryCategoriesDto {
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
  @IsString()
  search?: string;
}
