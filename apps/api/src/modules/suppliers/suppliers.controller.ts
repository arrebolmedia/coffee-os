import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
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

@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  @Post()
  create(
    @Body() createSupplierDto: CreateSupplierDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    // Always create within the caller's organization (ignore body org).
    return this.suppliersService.create({
      ...createSupplierDto,
      organization_id: this.requireOrg(user),
    });
  }

  @Get()
  findAll(
    @Query() query: QuerySuppliersDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.suppliersService.findAll(query, this.requireOrg(user));
  }

  // El organizationId del path se ignora; siempre se usa el del JWT.
  @Get('organization/:organizationId')
  findByOrganization(
    @Param('organizationId') _organizationId: string,
    @Query() query: QuerySuppliersDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.suppliersService.findAll(query, this.requireOrg(user));
  }

  @Get('organization/:organizationId/stats')
  getStats(
    @Param('organizationId') _organizationId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.suppliersService.getStats(this.requireOrg(user));
  }

  @Get('organization/:organizationId/search')
  search(
    @Param('organizationId') _organizationId: string,
    @Query('q') searchQuery: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.suppliersService.findAll(
      { search: searchQuery },
      this.requireOrg(user),
    );
  }

  @Get('stats/:organizationId')
  getStatsLegacy(
    @Param('organizationId') _organizationId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.suppliersService.getStats(this.requireOrg(user));
  }

  @Get(':id')
  findById(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.suppliersService.findById(id, this.requireOrg(user));
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.suppliersService.update(
      id,
      updateSupplierDto,
      this.requireOrg(user),
    );
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.suppliersService.delete(id, this.requireOrg(user));
  }
}
