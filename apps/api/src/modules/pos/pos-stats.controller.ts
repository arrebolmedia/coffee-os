import { Controller, Get, Param, Query } from '@nestjs/common';
import { PosService } from './pos.service';

@Controller('pos/stats')
export class PosStatsController {
  constructor(private readonly posService: PosService) {}

  @Get('daily/:orgId')
  async getDailyStats(
    @Param('orgId') orgId: string,
    @Query('date') date?: string,
  ) {
    return this.posService.getDailyStats(orgId, date);
  }
}
