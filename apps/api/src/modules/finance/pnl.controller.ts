import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';
import { PnLService } from './pnl.service';

@ApiBearerAuth()
@Controller('finance/pnl')
export class PnLController {
  constructor(private readonly pnlService: PnLService) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  @Get()
  async calculatePnL(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @CurrentUser() user: CurrentUserType,
    @Query('location_id') locationId?: string,
  ) {
    return this.pnlService.calculatePnL(
      this.requireOrg(user),
      new Date(startDate),
      new Date(endDate),
      locationId,
    );
  }

  @Get('monthly')
  async calculateMonthlyPnL(
    @Query('year') year: string,
    @Query('month') month: string,
    @CurrentUser() user: CurrentUserType,
    @Query('location_id') locationId?: string,
  ) {
    return this.pnlService.calculateMonthlyPnL(
      this.requireOrg(user),
      parseInt(year),
      parseInt(month),
      locationId,
    );
  }

  @Get('yearly')
  async calculateYearlyPnL(
    @Query('year') year: string,
    @CurrentUser() user: CurrentUserType,
    @Query('location_id') locationId?: string,
  ) {
    return this.pnlService.calculateYearlyPnL(
      this.requireOrg(user),
      parseInt(year),
      locationId,
    );
  }

  @Get('compare')
  async comparePeriods(
    @Query('period1_start') period1Start: string,
    @Query('period1_end') period1End: string,
    @Query('period2_start') period2Start: string,
    @Query('period2_end') period2End: string,
    @CurrentUser() user: CurrentUserType,
    @Query('location_id') locationId?: string,
  ) {
    return this.pnlService.comparePeriods(
      this.requireOrg(user),
      new Date(period1Start),
      new Date(period1End),
      new Date(period2Start),
      new Date(period2End),
      locationId,
    );
  }
}
