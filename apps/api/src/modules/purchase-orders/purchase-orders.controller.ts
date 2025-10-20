import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  QueryPurchaseOrdersDto,
  ReceivePurchaseOrderDto,
} from './dto';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(createDto);
  }

  @Get()
  findAll(@Query() query: QueryPurchaseOrdersDto) {
    return this.purchaseOrdersService.findAll(query);
  }

  @Get('stats/:organizationId')
  getStats(@Param('organizationId') organizationId: string) {
    return this.purchaseOrdersService.getStats(organizationId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.purchaseOrdersService.findById(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.update(id, updateDto);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body() body: { approved_by: string }) {
    return this.purchaseOrdersService.approve(id, body.approved_by);
  }

  @Patch(':id/send')
  sendToSupplier(@Param('id') id: string) {
    return this.purchaseOrdersService.sendToSupplier(id);
  }

  @Patch(':id/receive')
  receive(
    @Param('id') id: string,
    @Body() receiveDto: ReceivePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.receive(id, receiveDto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.purchaseOrdersService.cancel(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.purchaseOrdersService.delete(id);
  }
}
