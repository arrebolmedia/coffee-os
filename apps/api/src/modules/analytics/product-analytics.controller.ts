import { Controller, Get, Query } from '@nestjs/common';
import { ProductAnalyticsService } from './product-analytics.service';
import { QueryAnalyticsDto } from './dto';

@Controller('analytics/products')
export class ProductAnalyticsController {
  constructor(
    private readonly productAnalyticsService: ProductAnalyticsService,
  ) {}

  @Get()
  async getProductPerformance(@Query() query: QueryAnalyticsDto) {
    return this.productAnalyticsService.getProductPerformance(query);
  }

  @Get('categories')
  async getCategoryPerformance(@Query() query: QueryAnalyticsDto) {
    return this.productAnalyticsService.getCategoryPerformance(query);
  }

  @Get('top')
  async getTopProducts(
    @Query() query: QueryAnalyticsDto,
    @Query('by') by?: 'quantity' | 'revenue' | 'profit',
    @Query('limit') limit?: number,
  ) {
    return this.productAnalyticsService.getTopProducts(
      query,
      by || 'revenue',
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('low-performers')
  async getLowPerformers(
    @Query() query: QueryAnalyticsDto,
    @Query('limit') limit?: number,
  ) {
    return this.productAnalyticsService.getLowPerformers(
      query,
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('mix')
  async getProductMix(@Query() query: QueryAnalyticsDto) {
    return this.productAnalyticsService.getProductMix(query);
  }
}
