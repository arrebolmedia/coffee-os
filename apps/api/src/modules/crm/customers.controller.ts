import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomersDto } from './dto';

@Controller('crm/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateCustomerDto) {
    // In production, organizationId would come from authenticated user context
    const organizationId = 'org_default';
    return this.customersService.create(createDto, organizationId);
  }

  @Get()
  async findAll(@Query() query: QueryCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Get('stats')
  async getStats(@Query('organization_id') organizationId: string) {
    return this.customersService.getStats(organizationId || 'org_default');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const customer = await this.customersService.findOne(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateDto);
  }

  @Post(':id/visit')
  @HttpCode(HttpStatus.OK)
  async addVisit(@Param('id') id: string, @Body() body: { order_total: number }) {
    return this.customersService.addVisit(id, body.order_total);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.customersService.delete(id);
  }
}
