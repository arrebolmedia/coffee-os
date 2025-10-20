import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderType } from '../orders.service';

export class CreateOrderDto {
  @ApiPropertyOptional({
    description: 'Related transaction ID',
    example: 'txn-123',
  })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiProperty({
    description: 'Order type',
    enum: OrderType,
    example: OrderType.DINE_IN,
  })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiPropertyOptional({
    description: 'Table number (for DINE_IN)',
    example: '15',
  })
  @IsString()
  @IsOptional()
  tableNumber?: string;

  @ApiPropertyOptional({
    description: 'Customer name',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({
    description: 'Number of guests',
    example: 4,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  guestCount?: number;

  @ApiPropertyOptional({
    description: 'Special instructions or notes',
    example: 'Sin cebolla, por favor',
  })
  @IsString()
  @IsOptional()
  specialInstructions?: string;

  @ApiPropertyOptional({
    description: 'Delivery address (for DELIVERY)',
    example: 'Av. Insurgentes Sur 1234, Col. Del Valle',
  })
  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @ApiPropertyOptional({
    description: 'Delivery phone',
    example: '+52 55 1234 5678',
  })
  @IsString()
  @IsOptional()
  deliveryPhone?: string;

  @ApiPropertyOptional({
    description: 'Server/waiter name or ID',
    example: 'María García',
  })
  @IsString()
  @IsOptional()
  serverName?: string;
}
