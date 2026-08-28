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
import { TaxesService } from './taxes.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { QueryTaxesDto } from './dto/query-taxes.dto';

/**
 * Catálogo de impuestos. Ver la nota de `TaxesService`: estas definiciones NO
 * son las que cobra el punto de venta.
 */
@ApiTags('taxes')
@ApiBearerAuth()
@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tax' })
  @ApiResponse({ status: 201, description: 'Tax created successfully' })
  create(
    @Body() createTaxDto: CreateTaxDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    // Always create within the caller's organization (override body org).
    return this.taxesService.create({
      ...createTaxDto,
      organizationId: this.requireOrg(user),
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all taxes' })
  @ApiResponse({ status: 200, description: 'Returns all taxes' })
  findAll(@Query() query: QueryTaxesDto, @CurrentUser() user: CurrentUserType) {
    return this.taxesService.findAll(query, this.requireOrg(user));
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active taxes' })
  @ApiResponse({ status: 200, description: 'Returns all active taxes' })
  findActive(@CurrentUser() user: CurrentUserType) {
    return this.taxesService.findActive(this.requireOrg(user));
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get taxes by category' })
  @ApiResponse({
    status: 200,
    description: 'Returns taxes for specified category',
  })
  findByCategory(
    @Param('category') category: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.taxesService.findByCategory(category, this.requireOrg(user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tax by ID' })
  @ApiResponse({ status: 200, description: 'Returns a single tax' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.taxesService.findOne(id, this.requireOrg(user));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tax' })
  @ApiResponse({ status: 200, description: 'Tax updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateTaxDto: UpdateTaxDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.taxesService.update(id, updateTaxDto, this.requireOrg(user));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tax' })
  @ApiResponse({ status: 200, description: 'Tax deleted successfully' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.taxesService.remove(id, this.requireOrg(user));
  }
}
