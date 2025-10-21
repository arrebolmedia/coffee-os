import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ValidationRuleType } from '../interfaces';

export class SetValidationRuleDto {
  @IsEnum(ValidationRuleType)
  type: ValidationRuleType;

  value?: any;

  @IsString()
  @IsOptional()
  message?: string;
}
