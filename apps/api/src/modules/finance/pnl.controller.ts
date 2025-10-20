import { Controller, Get, Query } from '@nestjs/common';
import { PnLService } from './pnl.service';

@Controller('finance/pnl')
export class PnLController {
  constructor(private readonly pnlService: PnLService) {}

  @Get()
  async calculatePnL(
    @Query('organization_id') organizationId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('location_id') locationId?: string,
  ) {
    return this.pnlService.calculatePnL(
      organizationId,
      new Date(startDate),
      new Date(endDate),
      locationId,
    );
  }

  @Get('monthly')
  async calculateMonthlyPnL(
    @Query('organization_id') organizationId: string,
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('location_id') locationId?: string,
  ) {
    return this.pnlService.calculateMonthlyPnL(
      organizationId,
      parseInt(year),
      parseInt(month),
      locationId,
    );
  }

  @Get('yearly')
  async calculateYearlyPnL(
    @Query('organization_id') organizationId: string,
    @Query('year') year: string,
    @Query('location_id') locationId?: string,
  ) {
    return this.pnlService.calculateYearlyPnL(organizationId, parseInt(year), locationId);
  }

  @Get('compare')
  async comparePeriods(
    @Query('organization_id') organizationId: string,
    @Query('period1_start') period1Start: string,
    @Query('period1_end') period1End: string,
    @Query('period2_start') period2Start: string,
    @Query('period2_end') period2End: string,
    @Query('location_id') locationId?: string,
  ) {
    return this.pnlService.comparePeriods(
      organizationId,
      new Date(period1Start),
      new Date(period1End),
      new Date(period2Start),
      new Date(period2End),
      locationId,
    );
  }
}
