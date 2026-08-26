import { Controller, Get, Query, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';
import {
  PnLCompareQueryDto,
  PnLMonthlyQueryDto,
  PnLRangeQueryDto,
  PnLYearlyQueryDto,
} from './dto/query-pnl.dto';
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
  @ApiQuery({ name: 'start_date', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'end_date', required: true, example: '2026-12-31' })
  @ApiQuery({ name: 'location_id', required: false })
  async calculatePnL(
    @Query() query: PnLRangeQueryDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pnlService.calculatePnL(
      this.requireOrg(user),
      new Date(query.start_date),
      new Date(query.end_date),
      query.location_id,
    );
  }

  @Get('monthly')
  @ApiQuery({ name: 'year', required: true, example: 2026 })
  @ApiQuery({ name: 'month', required: true, example: 1 })
  @ApiQuery({ name: 'location_id', required: false })
  async calculateMonthlyPnL(
    @Query() query: PnLMonthlyQueryDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pnlService.calculateMonthlyPnL(
      this.requireOrg(user),
      query.year,
      query.month,
      query.location_id,
    );
  }

  @Get('yearly')
  @ApiQuery({ name: 'year', required: true, example: 2026 })
  @ApiQuery({ name: 'location_id', required: false })
  async calculateYearlyPnL(
    @Query() query: PnLYearlyQueryDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pnlService.calculateYearlyPnL(
      this.requireOrg(user),
      query.year,
      query.location_id,
    );
  }

  @Get('compare')
  @ApiQuery({ name: 'period1_start', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'period1_end', required: true, example: '2026-06-30' })
  @ApiQuery({ name: 'period2_start', required: true, example: '2026-07-01' })
  @ApiQuery({ name: 'period2_end', required: true, example: '2026-12-31' })
  @ApiQuery({ name: 'location_id', required: false })
  async comparePeriods(
    @Query() query: PnLCompareQueryDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.pnlService.comparePeriods(
      this.requireOrg(user),
      new Date(query.period1_start),
      new Date(query.period1_end),
      new Date(query.period2_start),
      new Date(query.period2_end),
      query.location_id,
    );
  }
}
