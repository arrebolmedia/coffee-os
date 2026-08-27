import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PosService } from './pos.service';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';

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

  // La caja que se consulta es la de la organización del JWT. Ver la nota en
  // PosStatsController: el `:orgId` del path queda sólo por compatibilidad.
  @Get('current/:orgId')
  async current(@CurrentOrg() organizationId: string) {
    return this.posService.getCurrentCashRegister(organizationId);
  }
}
