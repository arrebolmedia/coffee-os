import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/index';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Get paginated list of orders
   */
  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: 'asc' | 'desc',
  ) {
    return this.ordersService.findAll({
      page: page ? Number(page) : 1,
      perPage: perPage ? Number(perPage) : 10,
      search,
      status,
      date,
      sortBy,
      sortOrder,
    });
  }

  /**
   * Get order statistics
   */
  @Get('stats')
  async getStats(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.ordersService.getStats(startDate, endDate);
  }

  /**
   * Get single order by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  /**
   * Create new order
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  /**
   * Update order status
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto);
  }

  /**
   * Cancel order
   */
  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.ordersService.cancel(id, reason);
  }

  /**
   * Delete order
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
