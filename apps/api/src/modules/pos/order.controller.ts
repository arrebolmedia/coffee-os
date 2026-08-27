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
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
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

  // La organización con la que se consulta sale del JWT, no del path. El
  // parámetro se mantiene para no romper las URLs que ya usa el POS, y el
  // TenantGuard exige que coincida con la del token; pero aunque el guard
  // fallara, lo que se consulta aquí no lo decide el cliente.
  @Get('organization/:orgId/today')
  async findTodayByOrg(@CurrentOrg() organizationId: string) {
    return this.posService.findTodayOrdersByOrg(organizationId);
  }

  @Get('organization/:orgId')
  async findByOrgAndDateRange(
    @CurrentOrg() organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.posService.findOrdersByOrgAndDateRange(
      organizationId,
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

  // Los cuatro mutadores del KDS recibian solo el id y actualizaban por
  // `where: { id }`: cualquier usuario autenticado podia mover de estado la
  // orden de otra organizacion. Ahora todos derivan la organizacion del JWT.
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.posService.updateOrderStatus(id, status, user.organizationId);
  }

  @Post(':id/start')
  async start(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.posService.startOrder(id, user.organizationId);
  }

  @Post(':id/ready')
  async ready(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.posService.markOrderReady(id, user.organizationId);
  }

  @Post(':id/served')
  async served(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.posService.markOrderServed(id, user.organizationId);
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
