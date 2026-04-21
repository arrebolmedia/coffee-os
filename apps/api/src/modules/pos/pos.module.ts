import { Module } from '@nestjs/common';
import { PosService } from './pos.service';
import { TicketController } from './ticket.controller';
import { OrderController } from './order.controller';

@Module({
  controllers: [TicketController, OrderController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
