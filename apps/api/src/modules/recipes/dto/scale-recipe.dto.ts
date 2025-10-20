import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class ScaleRecipeDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  target_servings: number; // Número de porciones deseadas
}
