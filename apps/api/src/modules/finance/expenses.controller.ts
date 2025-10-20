import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto, QueryFinanceDto } from './dto';

@Controller('finance/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  async create(@Body() createDto: CreateExpenseDto) {
    return this.expensesService.create(createDto);
  }

  @Get()
  async findAll(@Query() query: QueryFinanceDto) {
    return this.expensesService.findAll(query);
  }

  @Get('stats')
  async getStats(
    @Query('organization_id') organizationId: string,
    @Query('location_id') locationId?: string,
  ) {
    return this.expensesService.getStats(organizationId, locationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateExpenseDto) {
    return this.expensesService.update(id, updateDto);
  }

  @Post(':id/pay')
  async markAsPaid(
    @Param('id') id: string,
    @Body() body: { paid_date: string; payment_method: string; reference?: string },
  ) {
    return this.expensesService.markAsPaid(
      id,
      new Date(body.paid_date),
      body.payment_method,
      body.reference,
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.expensesService.delete(id);
    return { message: 'Expense deleted successfully' };
  }
}
