import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto, UpdateInventoryItemDto, QueryInventoryItemsDto } from './dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateInventoryItemDto) {
    return this.inventoryService.create(createDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryInventoryItemsDto) {
    return this.inventoryService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.inventoryService.findById(id);
  }

  @Get('sku/:sku/:organization_id')
  @HttpCode(HttpStatus.OK)
  async findBySku(
    @Param('sku') sku: string,
    @Param('organization_id') organization_id: string,
  ) {
    return this.inventoryService.findBySku(sku, organization_id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateDto: UpdateInventoryItemDto) {
    return this.inventoryService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.inventoryService.delete(id);
  }

  @Patch(':id/stock')
  @HttpCode(HttpStatus.OK)
  async adjustStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('operation') operation: 'add' | 'subtract' | 'set',
    @Body('notes') notes?: string,
  ) {
    return this.inventoryService.adjustStock(id, quantity, operation, notes);
  }

  @Get(':id/movements')
  @HttpCode(HttpStatus.OK)
  async getMovements(@Param('id') id: string) {
    return this.inventoryService.getMovements(id);
  }

  @Get('organization/:id/stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@Param('id') id: string) {
    return this.inventoryService.getStats(id);
  }

  @Get('organization/:id/valuation')
  @HttpCode(HttpStatus.OK)
  async getValuation(@Param('id') id: string) {
    return this.inventoryService.getValuation(id);
  }
}
