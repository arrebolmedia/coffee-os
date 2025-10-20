import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { QueryAnalyticsDto } from './dto';

@Controller('analytics/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Query() query: QueryAnalyticsDto) {
    return this.dashboardService.getDashboard(query);
  }

  @Get('kpis')
  async getKPIDashboard(@Query() query: QueryAnalyticsDto) {
    return this.dashboardService.getKPIDashboard(query);
  }
}
