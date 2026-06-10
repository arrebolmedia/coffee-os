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
import { CashRegistersService } from './cash-registers.service';
import { CreateCashRegisterDto } from './dto/create-cash-register.dto';
import { UpdateCashRegisterDto } from './dto/update-cash-register.dto';
import { RecordDenominationDto } from './dto/record-denomination.dto';
import { RecordExpenseDto } from './dto/record-expense.dto';
import { QueryCashRegistersDto } from './dto/query-cash-registers.dto';

@ApiTags('cash-registers')
@ApiBearerAuth()
@Controller('cash-registers')
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new cash register' })
  @ApiResponse({
    status: 201,
    description: 'Cash register created successfully',
  })
  create(
    @Body() createCashRegisterDto: CreateCashRegisterDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    // Always create within the caller's organization (override body org).
    return this.cashRegistersService.create({
      ...createCashRegisterDto,
      organizationId: this.requireOrg(user),
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all cash registers' })
  @ApiResponse({ status: 200, description: 'Returns all cash registers' })
  findAll(
    @Query() query: QueryCashRegistersDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.cashRegistersService.findAll(query, this.requireOrg(user));
  }

  @Get('shift/:shiftId')
  @ApiOperation({ summary: 'Get cash register by shift' })
  @ApiResponse({
    status: 200,
    description: 'Returns cash register for shift',
  })
  findByShift(
    @Param('shiftId') shiftId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.cashRegistersService.findByShift(
      shiftId,
      this.requireOrg(user),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cash register by ID' })
  @ApiResponse({ status: 200, description: 'Returns a single cash register' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.cashRegistersService.findOne(id, this.requireOrg(user));
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
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.cashRegistersService.update(
      id,
      updateCashRegisterDto,
      this.requireOrg(user),
    );
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
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.cashRegistersService.recordDenominations(
      id,
      denominationDto,
      this.requireOrg(user),
    );
  }

  @Post(':id/expenses')
  @ApiOperation({ summary: 'Record cash expense' })
  @ApiResponse({ status: 200, description: 'Expense recorded successfully' })
  recordExpense(
    @Param('id') id: string,
    @Body() expenseDto: RecordExpenseDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.cashRegistersService.recordExpense(
      id,
      expenseDto,
      this.requireOrg(user),
    );
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Get cash register summary' })
  @ApiResponse({
    status: 200,
    description: 'Returns cash register summary',
  })
  getSummary(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.cashRegistersService.getSummary(id, this.requireOrg(user));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a cash register' })
  @ApiResponse({
    status: 200,
    description: 'Cash register deleted successfully',
  })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.cashRegistersService.remove(id, this.requireOrg(user));
  }
}
