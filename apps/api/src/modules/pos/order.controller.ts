import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
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
}
