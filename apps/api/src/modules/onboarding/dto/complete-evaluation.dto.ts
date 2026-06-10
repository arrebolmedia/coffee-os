import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EvaluationAnswer } from '../interfaces/onboarding.interface';

export class CompleteEvaluationDto {
  @IsNumber()
  @Min(0)
  score: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  answers?: EvaluationAnswer[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strengths?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  areas_for_improvement?: string[];
}
