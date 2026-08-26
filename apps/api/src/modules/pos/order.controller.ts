import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PosService } from './pos.service';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';

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

  @Get('organization/:orgId')
  async findByOrgAndDateRange(
    @Param('orgId') orgId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.posService.findOrdersByOrgAndDateRange(
      orgId,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    const order = await this.posService.findOneOrder(id, user.organizationId);
    // Sin esto devolvía 200 con body vacío para una orden de otra organización:
    // no es una fuga, pero un 200 vacío es indistinguible de "existe y no tiene
    // datos" y complica al frontend.
    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return order;
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
