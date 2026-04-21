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
  UseGuards,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query() query: QuerySuppliersDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.suppliersService.findAll(query, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('organization/:organizationId')
  findByOrganization(
    @Param('organizationId') organizationId: string,
    @Query() query: QuerySuppliersDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.suppliersService.findAll(
      {
        ...query,
        organization_id: organizationId,
      },
      user,
    );
  }

  @Get('organization/:organizationId/stats')
  getStats(@Param('organizationId') organizationId: string) {
    return this.suppliersService.getStats(organizationId);
  }

  @Get('organization/:organizationId/category/:category')
  findByCategory(
    @Param('organizationId') organizationId: string,
    @Param('category') category: string,
  ) {
    // Category filtering will be added to service later
    return this.suppliersService.findAll({ organization_id: organizationId });
  }

  @Get('organization/:organizationId/search')
  search(
    @Param('organizationId') organizationId: string,
    @Query('q') searchQuery: string,
  ) {
    return this.suppliersService.findAll({
      organization_id: organizationId,
      search: searchQuery,
    });
  }

  @Get('stats/:organizationId')
  getStatsLegacy(@Param('organizationId') organizationId: string) {
    return this.suppliersService.getStats(organizationId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.suppliersService.findById(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Patch(':id/rating')
  updateRating(
    @Param('id') id: string,
    @Body() body: { rating: number; on_time_delivery_rate?: number },
  ) {
    return this.suppliersService.updateRating(
      id,
      body.rating,
      body.on_time_delivery_rate,
    );
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.suppliersService.delete(id);
  }
}
