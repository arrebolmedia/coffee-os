import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ModifierType {
  SIZE = 'SIZE',
  MILK = 'MILK',
  EXTRA = 'EXTRA',
  SYRUP = 'SYRUP',
  DECAF = 'DECAF',
}

export class CreateModifierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(ModifierType, {
    message: 'Type must be one of: SIZE, MILK, EXTRA, SYRUP, DECAF',
  })
  type: ModifierType;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  priceDelta?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
