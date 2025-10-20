import { PartialType } from '@nestjs/mapped-types';
import { CreateRecipeDto } from './create-recipe.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateRecipeDto extends PartialType(CreateRecipeDto) {
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
