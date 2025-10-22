import { IsOptional, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class OrderStatsDto {
  @ApiPropertyOptional({
    description: 'Organization ID',
    example: 'org_abc123',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Location ID',
    example: 'loc_xyz789',
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({
    description: 'Start date (ISO format)',
    example: '2025-10-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO format)',
    example: '2025-10-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export interface OrderStats {
  totalOrders: number;
  totalSales: number;
  averageTicket: number;
  todayOrders: number;
  todaySales: number;
  growthPercentage: number;
  byStatus: {
    PENDING: number;
    IN_PROGRESS: number;
    READY: number;
    SERVED: number;
    CANCELLED: number;
  };
  byType: {
    DINE_IN: number;
    TAKE_OUT: number;
    DELIVERY: number;
  };
  byPaymentMethod: {
    CASH: number;
    CARD: number;
    TRANSFER: number;
    MIXED: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}
