import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovementType, MovementReason } from '../inventory-movements.service';

export class CreateInventoryMovementDto {
  @ApiProperty({
    description: 'Inventory item ID',
    example: 'clh1234567890',
  })
  @IsString()
  @IsNotEmpty()
  inventoryItemId: string;

  @ApiProperty({
    description: 'Movement type',
    enum: MovementType,
    example: MovementType.IN,
  })
  @IsEnum(MovementType)
  type: MovementType;

  @ApiProperty({
    description: 'Movement reason',
    enum: MovementReason,
    example: MovementReason.PURCHASE,
  })
  @IsEnum(MovementReason)
  reason: MovementReason;

  @ApiProperty({
    description: 'Quantity moved (positive number)',
    example: 50,
  })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Unit of measure',
    example: 'kg',
  })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({
    description: 'Unit cost at time of movement',
    example: 12.5,
  })
  @IsNumber()
  @IsOptional()
  unitCost?: number;

  @ApiPropertyOptional({
    description: 'Total cost of movement',
    example: 625.0,
  })
  @IsNumber()
  @IsOptional()
  totalCost?: number;

  @ApiPropertyOptional({
    description: 'Reference document number (PO, invoice, etc.)',
    example: 'PO-2024-001',
  })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiPropertyOptional({
    description: 'Related transaction ID (for sales)',
    example: 'txn-123',
  })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Related supplier ID (for purchases)',
    example: 'sup-456',
  })
  @IsString()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'Location identifier',
    example: 'WAREHOUSE-A',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Received in good condition',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Movement date and time (ISO 8601)',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDateString()
  @IsOptional()
  movementDate?: string;
}
