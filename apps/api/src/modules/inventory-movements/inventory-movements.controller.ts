import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';
import { InventoryMovementsService } from './inventory-movements.service';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { UpdateInventoryMovementDto } from './dto/update-inventory-movement.dto';
import { QueryInventoryMovementsDto } from './dto/query-inventory-movements.dto';

@ApiTags('inventory-movements')
@ApiBearerAuth()
@Controller('inventory-movements')
export class InventoryMovementsController {
  constructor(
    private readonly inventoryMovementsService: InventoryMovementsService,
  ) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  @Post()
  @ApiOperation({ summary: 'Create inventory movement' })
  @ApiResponse({ status: 201, description: 'Movement created successfully' })
  create(
    @Body() createInventoryMovementDto: CreateInventoryMovementDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.inventoryMovementsService.create(
      createInventoryMovementDto,
      this.requireOrg(user),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all inventory movements' })
  @ApiResponse({ status: 200, description: 'Return all movements' })
  findAll(
    @Query() query: QueryInventoryMovementsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.inventoryMovementsService.findAll(query, this.requireOrg(user));
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get movements by type' })
  @ApiResponse({ status: 200, description: 'Return movements by type' })
  findByType(
    @Param('type') type: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.inventoryMovementsService.findByType(
      type,
      this.requireOrg(user),
    );
  }

  @Get('item/:itemId')
  @ApiOperation({ summary: 'Get movements by inventory item' })
  @ApiResponse({ status: 200, description: 'Return movements by item' })
  findByItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.inventoryMovementsService.findByItem(
      itemId,
      this.requireOrg(user),
    );
  }

  @Get('date-range')
  @ApiOperation({ summary: 'Get movements by date range' })
  @ApiResponse({ status: 200, description: 'Return movements in date range' })
  findByDateRange(
    @Query() query: QueryInventoryMovementsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.inventoryMovementsService.findByDateRange(
      query.startDate,
      query.endDate,
      this.requireOrg(user),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory movement by id' })
  @ApiResponse({ status: 200, description: 'Return movement' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.inventoryMovementsService.findOne(id, this.requireOrg(user));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory movement' })
  @ApiResponse({ status: 200, description: 'Movement updated successfully' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  async update(
    @Param('id') id: string,
    @Body() updateInventoryMovementDto: UpdateInventoryMovementDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    // Ownership check (404 if the movement belongs to another org).
    await this.inventoryMovementsService.findOne(id, this.requireOrg(user));
    return this.inventoryMovementsService.update(
      id,
      updateInventoryMovementDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory movement' })
  @ApiResponse({ status: 200, description: 'Movement deleted successfully' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    // Ownership check (404 if the movement belongs to another org).
    await this.inventoryMovementsService.findOne(id, this.requireOrg(user));
    return this.inventoryMovementsService.remove(id);
  }
}
