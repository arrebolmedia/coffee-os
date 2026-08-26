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
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/index';

@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  /**
   * Get paginated list of orders (scoped to the caller's organization)
   */
  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserType,
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
      organizationId: this.requireOrg(user),
    });
  }

  /**
   * Get order statistics (scoped to the caller's organization)
   */
  @Get('stats')
  async getStats(
    @CurrentUser() user: CurrentUserType,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.ordersService.getStats(
      startDate,
      endDate,
      this.requireOrg(user),
    );
  }

  /**
   * Get single order by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.ordersService.findOne(id, this.requireOrg(user));
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
    @CurrentUser() user: CurrentUserType,
  ) {
    // Sin la organizacion, el findOne interno consultaba sin filtro y se podia
    // mover de estado la orden de otro tenant.
    return this.ordersService.updateStatus(
      id,
      updateStatusDto,
      this.requireOrg(user),
    );
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
