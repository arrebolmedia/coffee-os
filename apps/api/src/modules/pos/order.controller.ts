import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PosService } from './pos.service';

@Controller('pos/orders')
export class OrderController {
  constructor(private readonly posService: PosService) {}

  @Get()
  async findAll(
    @Query('locationId') locationId: string,
    @Query('status') status?: string,
  ) {
    return this.posService.findAllOrders(locationId, status);
  }

  @Get('organization/:orgId/today')
  async findTodayByOrg(@Param('orgId') orgId: string) {
    return this.posService.findTodayOrdersByOrg(orgId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.posService.findOneOrder(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.posService.updateOrderStatus(id, status);
  }

  @Post(':id/start')
  async start(@Param('id') id: string) {
    return this.posService.startOrder(id);
  }

  @Post(':id/ready')
  async ready(@Param('id') id: string) {
    return this.posService.markOrderReady(id);
  }

  @Post(':id/served')
  async served(@Param('id') id: string) {
    return this.posService.markOrderServed(id);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.posService.cancelTicket(id, reason ?? '');
  }

  @Post(':id/refund')
  async refund(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('amount') amount?: number,
  ) {
    return this.posService.refundTicket(id, reason ?? '', amount);
  }

  @Get(':id/receipt')
  async receipt(@Param('id') id: string) {
    return this.posService.getReceipt(id);
  }
}
