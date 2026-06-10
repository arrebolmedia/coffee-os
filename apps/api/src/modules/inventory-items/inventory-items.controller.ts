import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { InventoryItemsService } from './inventory-items.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { QueryInventoryItemsDto } from './dto/query-inventory-items.dto';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';

@Controller('inventory-items')
export class InventoryItemsController {
  constructor(private readonly inventoryItemsService: InventoryItemsService) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createInventoryItemDto: CreateInventoryItemDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const organizationId = this.requireOrg(user);
    if (
      createInventoryItemDto.organizationId &&
      createInventoryItemDto.organizationId !== organizationId
    ) {
      throw new ForbiddenException(
        'organizationId does not match authenticated user',
      );
    }
    return this.inventoryItemsService.create({
      ...createInventoryItemDto,
      organizationId,
    });
  }

  @Get()
  async findAll(
    @Query() query: QueryInventoryItemsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.inventoryItemsService.findAll(query, this.requireOrg(user));
  }

  @Get('active')
  async findAllActive(@CurrentUser() user: CurrentUserType) {
    return this.inventoryItemsService.findAllActive(this.requireOrg(user));
  }

  @Get('low-stock')
  async findLowStock(@CurrentUser() user: CurrentUserType) {
    return this.inventoryItemsService.findLowStock(this.requireOrg(user));
  }

  @Get('category/:category')
  async findByCategory(
    @Param('category') category: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.inventoryItemsService.findByCategory(
      category,
      this.requireOrg(user),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    const organizationId = this.requireOrg(user);
    const item = await this.inventoryItemsService.findOne(id);
    if ((item as any).organizationId !== organizationId) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }
    return item;
  }

  @Get('code/:code')
  async findByCode(
    @Param('code') code: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.inventoryItemsService.findByCode(code, this.requireOrg(user));
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateInventoryItemDto: UpdateInventoryItemDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const organizationId = this.requireOrg(user);
    const item = await this.inventoryItemsService.findOne(id);
    if ((item as any).organizationId !== organizationId) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }
    return this.inventoryItemsService.update(id, updateInventoryItemDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    const organizationId = this.requireOrg(user);
    const item = await this.inventoryItemsService.findOne(id);
    if ((item as any).organizationId !== organizationId) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }
    await this.inventoryItemsService.remove(id);
  }
}
