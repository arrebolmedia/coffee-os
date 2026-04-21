import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderPriority, OrderType } from '@prisma/client';

export class CreateOrderDto {
  @IsString()
  locationId: string;

  @IsString()
  ticketId: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  @IsOptional()
  @IsEnum(OrderPriority)
  priority?: OrderPriority;

  @IsOptional()
  @IsString()
  tableNumber?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}
