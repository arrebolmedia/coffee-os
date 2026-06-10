import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PosService } from './pos.service';

@Controller('pos/cash-register')
export class PosCashRegisterController {
  constructor(private readonly posService: PosService) {}

  @Post('open')
  async open(
    @Body()
    body: {
      organization_id: string;
      initial_amount: number;
      user_id: string;
      location_id?: string;
    },
  ) {
    return this.posService.openCashRegisterForOrg(body);
  }

  @Post(':id/close')
  async close(
    @Param('id') id: string,
    @Body('final_amount') finalAmount: number,
    @Body('notes') notes?: string,
  ) {
    return this.posService.closeCashRegisterById(id, finalAmount, notes);
  }

  @Get('current/:orgId')
  async current(@Param('orgId') orgId: string) {
    return this.posService.getCurrentCashRegister(orgId);
  }
}
