import { IsArray, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderCategoriesDto {
  @ApiProperty({
    description: 'Array of category reordering items',
    example: [
      { id: 'cat1', sortOrder: 0 },
      { id: 'cat2', sortOrder: 1 },
      { id: 'cat3', sortOrder: 2 },
    ],
    type: 'array',
  })
  @IsArray()
  orders: ReorderItem[];
}

export class ReorderItem {
  @ApiProperty({
    description: 'Category ID',
    example: 'cat_abc123',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'New sort order',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  sortOrder: number;
}

export class BulkDeleteCategoriesDto {
  @ApiProperty({
    description: 'Array of category IDs to delete',
    example: ['cat1', 'cat2', 'cat3'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  categoryIds: string[];
}

export class BulkUpdateStatusDto {
  @ApiProperty({
    description: 'Array of category IDs to update',
    example: ['cat1', 'cat2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  categoryIds: string[];

  @ApiProperty({
    description: 'New status',
    example: 'active',
    enum: ['active', 'inactive', 'archived'],
  })
  @IsString()
  status: 'active' | 'inactive' | 'archived';
}
