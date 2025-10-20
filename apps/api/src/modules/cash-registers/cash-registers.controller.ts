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
import { CashRegistersService } from './cash-registers.service';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { UpdateCashRegisterDto } from './dto/update-cash-register.dto';
import { RecordDenominationDto } from './dto/record-denomination.dto';
import { RecordExpenseDto } from './dto/record-expense.dto';
import { QueryCashRegistersDto } from './dto/query-cash-registers.dto';

@ApiTags('cash-registers')
@Controller('cash-registers')
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new cash register' })
  @ApiResponse({
    status: 201,
    description: 'Cash register created successfully',
  })
  create(@Body() createCashRegisterDto: CreateCashRegisterDto) {
    return this.cashRegistersService.create(createCashRegisterDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cash registers' })
  @ApiResponse({ status: 200, description: 'Returns all cash registers' })
  findAll(@Query() query: QueryCashRegistersDto) {
    return this.cashRegistersService.findAll(query);
  }

  @Get('shift/:shiftId')
  @ApiOperation({ summary: 'Get cash register by shift' })
  @ApiResponse({
    status: 200,
    description: 'Returns cash register for shift',
  })
  findByShift(@Param('shiftId') shiftId: string) {
    return this.cashRegistersService.findByShift(shiftId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cash register by ID' })
  @ApiResponse({ status: 200, description: 'Returns a single cash register' })
  findOne(@Param('id') id: string) {
    return this.cashRegistersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a cash register' })
  @ApiResponse({
    status: 200,
    description: 'Cash register updated successfully',
  })
  update(
    @Param('id') id: string,
    @Body() updateCashRegisterDto: UpdateCashRegisterDto,
  ) {
    return this.cashRegistersService.update(id, updateCashRegisterDto);
  }

  @Post(':id/denominations')
  @ApiOperation({ summary: 'Record cash denominations' })
  @ApiResponse({
    status: 200,
    description: 'Denominations recorded successfully',
  })
  recordDenominations(
    @Param('id') id: string,
    @Body() denominationDto: RecordDenominationDto,
  ) {
    return this.cashRegistersService.recordDenominations(id, denominationDto);
  }

  @Post(':id/expenses')
  @ApiOperation({ summary: 'Record cash expense' })
  @ApiResponse({ status: 200, description: 'Expense recorded successfully' })
  recordExpense(@Param('id') id: string, @Body() expenseDto: RecordExpenseDto) {
    return this.cashRegistersService.recordExpense(id, expenseDto);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get cash register summary' })
  @ApiResponse({
    status: 200,
    description: 'Returns cash register summary',
  })
  getSummary(@Param('id') id: string) {
    return this.cashRegistersService.getSummary(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a cash register' })
  @ApiResponse({
    status: 200,
    description: 'Cash register deleted successfully',
  })
  remove(@Param('id') id: string) {
    return this.cashRegistersService.remove(id);
  }
}
