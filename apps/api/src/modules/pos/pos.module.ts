import { Module } from '@nestjs/common';
import { PosService } from './pos.service';
import { TicketController } from './ticket.controller';
import { OrderController } from './order.controller';
import { PosStatsController } from './pos-stats.controller';
import { PosCashRegisterController } from './pos-cash-register.controller';
import { PosPaymentMethodsController } from './pos-payment-methods.controller';

@Module({
  controllers: [
    TicketController,
    OrderController,
    PosStatsController,
    PosCashRegisterController,
    PosPaymentMethodsController,
  ],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
