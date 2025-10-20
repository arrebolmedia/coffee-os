import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'Return all orders' })
  findAll(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAll(query);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get orders by status' })
  @ApiResponse({ status: 200, description: 'Return orders by status' })
  findByStatus(@Param('status') status: string) {
    return this.ordersService.findByStatus(status);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get orders by type' })
  @ApiResponse({ status: 200, description: 'Return orders by type' })
  findByType(@Param('type') type: string) {
    return this.ordersService.findByType(type);
  }

  @Get('table/:tableNumber')
  @ApiOperation({ summary: 'Get orders by table number' })
  @ApiResponse({ status: 200, description: 'Return orders by table' })
  findByTable(@Param('tableNumber') tableNumber: string) {
    return this.ordersService.findByTable(tableNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by id' })
  @ApiResponse({ status: 200, description: 'Return order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Start preparing order' })
  @ApiResponse({ status: 200, description: 'Order started successfully' })
  startOrder(@Param('id') id: string) {
    return this.ordersService.startOrder(id);
  }

  @Patch(':id/ready')
  @ApiOperation({ summary: 'Mark order as ready' })
  @ApiResponse({ status: 200, description: 'Order marked as ready' })
  markReady(@Param('id') id: string) {
    return this.ordersService.markReady(id);
  }

  @Patch(':id/serve')
  @ApiOperation({ summary: 'Mark order as served' })
  @ApiResponse({ status: 200, description: 'Order marked as served' })
  markServed(@Param('id') id: string) {
    return this.ordersService.markServed(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  cancel(@Param('id') id: string) {
    return this.ordersService.cancel(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete order' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
