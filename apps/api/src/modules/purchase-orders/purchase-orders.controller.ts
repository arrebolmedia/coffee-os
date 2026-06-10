import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  CreatePurchaseOrderDto,
  QueryPurchaseOrdersDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto';

@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  /**
   * Ownership check: a purchase order from another organization is reported
   * as not found (404) to avoid leaking cross-tenant data.
   */
  private async assertOwnership(
    id: string,
    organizationId: string,
  ): Promise<void> {
    const order = await this.purchaseOrdersService.findById(id);
    if (order.organization_id !== organizationId) {
      throw new NotFoundException(`Purchase order with ID ${id} not found`);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createDto: CreatePurchaseOrderDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    // Always create within the caller's organization (ignore body org).
    return this.purchaseOrdersService.create({
      ...createDto,
      organization_id: this.requireOrg(user),
    });
  }

  @Get()
  findAll(
    @Query() query: QueryPurchaseOrdersDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    // The org filter always comes from the JWT, never from the query string.
    return this.purchaseOrdersService.findAll({
      ...query,
      organization_id: this.requireOrg(user),
    });
  }

  // El organizationId del path se ignora; siempre se usa el del JWT.
  @Get('stats/:organizationId')
  getStats(
    @Param('organizationId') _organizationId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.purchaseOrdersService.getStats(this.requireOrg(user));
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.assertOwnership(id, this.requireOrg(user));
    return this.purchaseOrdersService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePurchaseOrderDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.assertOwnership(id, this.requireOrg(user));
    return this.purchaseOrdersService.update(id, updateDto);
  }

  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() body: { approved_by: string },
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.assertOwnership(id, this.requireOrg(user));
    return this.purchaseOrdersService.approve(id, body.approved_by);
  }

  @Patch(':id/send')
  async sendToSupplier(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.assertOwnership(id, this.requireOrg(user));
    return this.purchaseOrdersService.sendToSupplier(id);
  }

  @Patch(':id/receive')
  async receive(
    @Param('id') id: string,
    @Body() receiveDto: ReceivePurchaseOrderDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    await this.assertOwnership(id, this.requireOrg(user));
    return this.purchaseOrdersService.receive(id, receiveDto);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    await this.assertOwnership(id, this.requireOrg(user));
    return this.purchaseOrdersService.cancel(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    await this.assertOwnership(id, this.requireOrg(user));
    return this.purchaseOrdersService.delete(id);
  }
}
