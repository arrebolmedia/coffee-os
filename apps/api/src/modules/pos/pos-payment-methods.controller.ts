import { Controller, Get, Param } from '@nestjs/common';
import { PosService } from './pos.service';

@Controller('pos/payment-methods')
export class PosPaymentMethodsController {
  constructor(private readonly posService: PosService) {}

  @Get(':orgId')
  async getPaymentMethods(@Param('orgId') orgId: string) {
    return this.posService.getPaymentMethods(orgId);
  }
}
