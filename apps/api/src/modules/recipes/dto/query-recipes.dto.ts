import {
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryRecipesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 50;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;
}
