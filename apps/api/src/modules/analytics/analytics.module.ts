import { Module } from '@nestjs/common';
import { SalesAnalyticsService } from './sales-analytics.service';
import { ProductAnalyticsService } from './product-analytics.service';
import { DashboardService } from './dashboard.service';
import { SalesAnalyticsController } from './sales-analytics.controller';
import { ProductAnalyticsController } from './product-analytics.controller';
import { DashboardController } from './dashboard.controller';

@Module({
  controllers: [
    SalesAnalyticsController,
    ProductAnalyticsController,
    DashboardController,
  ],
  providers: [
    SalesAnalyticsService,
    ProductAnalyticsService,
    DashboardService,
  ],
  exports: [
    SalesAnalyticsService,
    ProductAnalyticsService,
    DashboardService,
  ],
})
export class AnalyticsModule {}
