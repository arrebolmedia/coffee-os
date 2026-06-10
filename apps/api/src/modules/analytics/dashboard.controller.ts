import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { QueryAnalyticsDto } from './dto';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';

@Controller('analytics/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  @Get()
  async getDashboard(
    @Query() query: QueryAnalyticsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.dashboardService.getDashboard({
      ...query,
      organization_id: this.requireOrg(user),
    });
  }

  @Get('kpis')
  async getKPIDashboard(
    @Query() query: QueryAnalyticsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.dashboardService.getKPIDashboard({
      ...query,
      organization_id: this.requireOrg(user),
    });
  }
}
