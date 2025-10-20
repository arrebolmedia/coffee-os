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
import { TaxesService } from './taxes.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { QueryTaxesDto } from './dto/query-taxes.dto';

@ApiTags('taxes')
@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tax' })
  @ApiResponse({ status: 201, description: 'Tax created successfully' })
  create(@Body() createTaxDto: CreateTaxDto) {
    return this.taxesService.create(createTaxDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all taxes' })
  @ApiResponse({ status: 200, description: 'Returns all taxes' })
  findAll(@Query() query: QueryTaxesDto) {
    return this.taxesService.findAll(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active taxes' })
  @ApiResponse({ status: 200, description: 'Returns all active taxes' })
  findActive() {
    return this.taxesService.findActive();
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get taxes by category' })
  @ApiResponse({
    status: 200,
    description: 'Returns taxes for specified category',
  })
  findByCategory(@Param('category') category: string) {
    return this.taxesService.findByCategory(category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tax by ID' })
  @ApiResponse({ status: 200, description: 'Returns a single tax' })
  findOne(@Param('id') id: string) {
    return this.taxesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tax' })
  @ApiResponse({ status: 200, description: 'Tax updated successfully' })
  update(@Param('id') id: string, @Body() updateTaxDto: UpdateTaxDto) {
    return this.taxesService.update(id, updateTaxDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tax' })
  @ApiResponse({ status: 200, description: 'Tax deleted successfully' })
  remove(@Param('id') id: string) {
    return this.taxesService.remove(id);
  }
}
