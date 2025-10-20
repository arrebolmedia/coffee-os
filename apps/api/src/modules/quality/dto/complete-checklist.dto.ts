import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChecklistItemCompletionDto {
  @IsNotEmpty()
  @IsString()
  item_id: string;

  @IsBoolean()
  completed: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  photo_url?: string; // Evidence photo
}

export class CompleteChecklistDto {
  @IsNotEmpty()
  @IsString()
  completed_by_user_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemCompletionDto)
  items: ChecklistItemCompletionDto[];

  @IsOptional()
  @IsString()
  general_notes?: string;
}
