import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InventoryItemsService } from './inventory-items.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { QueryInventoryItemsDto } from './dto/query-inventory-items.dto';

@Controller('inventory-items')
export class InventoryItemsController {
  constructor(private readonly inventoryItemsService: InventoryItemsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createInventoryItemDto: CreateInventoryItemDto) {
    return this.inventoryItemsService.create(createInventoryItemDto);
  }

  @Get()
  async findAll(@Query() query: QueryInventoryItemsDto) {
    return this.inventoryItemsService.findAll(query);
  }

  @Get('active')
  async findAllActive() {
    return this.inventoryItemsService.findAllActive();
  }

  @Get('low-stock')
  async findLowStock() {
    return this.inventoryItemsService.findLowStock();
  }

  @Get('category/:category')
  async findByCategory(@Param('category') category: string) {
    return this.inventoryItemsService.findByCategory(category);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.inventoryItemsService.findOne(id);
  }

  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    return this.inventoryItemsService.findByCode(code);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateInventoryItemDto: UpdateInventoryItemDto,
  ) {
    return this.inventoryItemsService.update(id, updateInventoryItemDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.inventoryItemsService.remove(id);
  }
}
