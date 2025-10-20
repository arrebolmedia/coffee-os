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
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @Get()
  findAll(@Query() query: QuerySuppliersDto) {
    return this.suppliersService.findAll(query);
  }

  @Get('stats/:organizationId')
  getStats(@Param('organizationId') organizationId: string) {
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

