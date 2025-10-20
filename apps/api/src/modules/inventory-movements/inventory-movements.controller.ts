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
import { InventoryMovementsService } from './inventory-movements.service';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { UpdateInventoryMovementDto } from './dto/update-inventory-movement.dto';
import { QueryInventoryMovementsDto } from './dto/query-inventory-movements.dto';

@ApiTags('inventory-movements')
@Controller('inventory-movements')
export class InventoryMovementsController {
  constructor(
    private readonly inventoryMovementsService: InventoryMovementsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create inventory movement' })
  @ApiResponse({ status: 201, description: 'Movement created successfully' })
  create(@Body() createInventoryMovementDto: CreateInventoryMovementDto) {
    return this.inventoryMovementsService.create(createInventoryMovementDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all inventory movements' })
  @ApiResponse({ status: 200, description: 'Return all movements' })
  findAll(@Query() query: QueryInventoryMovementsDto) {
    return this.inventoryMovementsService.findAll(query);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get movements by type' })
  @ApiResponse({ status: 200, description: 'Return movements by type' })
  findByType(@Param('type') type: string) {
    return this.inventoryMovementsService.findByType(type);
  }

  @Get('item/:itemId')
  @ApiOperation({ summary: 'Get movements by inventory item' })
  @ApiResponse({ status: 200, description: 'Return movements by item' })
  findByItem(@Param('itemId') itemId: string) {
    return this.inventoryMovementsService.findByItem(itemId);
  }

  @Get('date-range')
  @ApiOperation({ summary: 'Get movements by date range' })
  @ApiResponse({ status: 200, description: 'Return movements in date range' })
  findByDateRange(@Query() query: QueryInventoryMovementsDto) {
    return this.inventoryMovementsService.findByDateRange(
      query.startDate,
      query.endDate,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory movement by id' })
  @ApiResponse({ status: 200, description: 'Return movement' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  findOne(@Param('id') id: string) {
    return this.inventoryMovementsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory movement' })
  @ApiResponse({ status: 200, description: 'Movement updated successfully' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  update(
    @Param('id') id: string,
    @Body() updateInventoryMovementDto: UpdateInventoryMovementDto,
  ) {
    return this.inventoryMovementsService.update(
      id,
      updateInventoryMovementDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory movement' })
  @ApiResponse({ status: 200, description: 'Movement deleted successfully' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  remove(@Param('id') id: string) {
    return this.inventoryMovementsService.remove(id);
  }
}
