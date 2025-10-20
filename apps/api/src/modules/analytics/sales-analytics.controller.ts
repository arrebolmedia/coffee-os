import { Controller, Get, Query } from '@nestjs/common';
import { SalesAnalyticsService } from './sales-analytics.service';
import { QueryAnalyticsDto, TimeGranularity } from './dto';

@Controller('analytics/sales')
export class SalesAnalyticsController {
  constructor(
    private readonly salesAnalyticsService: SalesAnalyticsService,
  ) {}

  @Get()
  async getSalesMetrics(@Query() query: QueryAnalyticsDto) {
    return this.salesAnalyticsService.getSalesMetrics(query);
  }

  @Get('top-products')
  async getTopSellingProducts(
    @Query() query: QueryAnalyticsDto,
    @Query('limit') limit?: number,
  ) {
    return this.salesAnalyticsService.getTopSellingProducts(
      query,
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('by-category')
  async getSalesByCategory(@Query() query: QueryAnalyticsDto) {
    return this.salesAnalyticsService.getSalesByCategory(query);
  }

  @Get('trend')
  async getSalesTrend(
    @Query() query: QueryAnalyticsDto,
    @Query('granularity') granularity?: TimeGranularity,
  ) {
    return this.salesAnalyticsService.getSalesTrend(
      query,
      granularity || TimeGranularity.DAILY,
    );
  }
}
