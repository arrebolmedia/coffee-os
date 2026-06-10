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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { QueryDiscountsDto } from './dto/query-discounts.dto';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';

@ApiTags('discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new discount' })
  @ApiResponse({ status: 201, description: 'Discount created successfully' })
  create(
    @Body() createDiscountDto: CreateDiscountDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    // organizationId siempre se toma del JWT — ignora el del body
    return this.discountsService.create({
      ...createDiscountDto,
      organizationId: this.requireOrg(user),
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all discounts' })
  @ApiResponse({ status: 200, description: 'Returns all discounts' })
  findAll(
    @Query() query: QueryDiscountsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.discountsService.findAll(query, this.requireOrg(user));
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active discounts' })
  @ApiResponse({ status: 200, description: 'Returns all active discounts' })
  findActive(@CurrentUser() user: CurrentUserType) {
    return this.discountsService.findActive(this.requireOrg(user));
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get discounts by type' })
  @ApiResponse({
    status: 200,
    description: 'Returns discounts of specified type',
  })
  findByType(
    @Param('type') type: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.discountsService.findByType(type, this.requireOrg(user));
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get discount by code' })
  @ApiResponse({ status: 200, description: 'Returns discount with given code' })
  findByCode(
    @Param('code') code: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.discountsService.findByCode(code, this.requireOrg(user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get discount by ID' })
  @ApiResponse({ status: 200, description: 'Returns a single discount' })
  findOne(@Param('id') id: string) {
    return this.discountsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a discount' })
  @ApiResponse({ status: 200, description: 'Discount updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateDiscountDto: UpdateDiscountDto,
  ) {
    return this.discountsService.update(id, updateDiscountDto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a discount' })
  @ApiResponse({ status: 200, description: 'Discount activated successfully' })
  activate(@Param('id') id: string) {
    return this.discountsService.activate(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a discount' })
  @ApiResponse({
    status: 200,
    description: 'Discount deactivated successfully',
  })
  deactivate(@Param('id') id: string) {
    return this.discountsService.deactivate(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a discount' })
  @ApiResponse({ status: 200, description: 'Discount deleted successfully' })
  remove(@Param('id') id: string) {
    return this.discountsService.remove(id);
  }
}
