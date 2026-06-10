import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, QueryFinanceDto, UpdateExpenseDto } from './dto';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';

@Controller('finance/expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  @Post()
  async create(
    @Body() createDto: CreateExpenseDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const organizationId = this.requireOrg(user);
    if (
      createDto.organization_id &&
      createDto.organization_id !== organizationId
    ) {
      throw new ForbiddenException(
        'organization_id does not match authenticated user',
      );
    }
    return this.expensesService.create(
      { ...createDto, organization_id: organizationId },
      user.userId,
    );
  }

  @Get()
  async findAll(
    @Query() query: QueryFinanceDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.expensesService.findAll({
      ...query,
      organization_id: this.requireOrg(user),
    });
  }

  @Get('stats')
  async getStats(
    @Query('location_id') locationId: string | undefined,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.expensesService.getStats(this.requireOrg(user), locationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    const organizationId = this.requireOrg(user);
    const expense = await this.expensesService.findOne(id);
    if (!expense || expense.organization_id !== organizationId) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateExpenseDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const organizationId = this.requireOrg(user);
    const expense = await this.expensesService.findOne(id);
    if (!expense || expense.organization_id !== organizationId) {
      throw new NotFoundException('Expense not found');
    }
    return this.expensesService.update(id, updateDto);
  }

  @Post(':id/pay')
  async markAsPaid(
    @Param('id') id: string,
    @Body()
    body: { paid_date: string; payment_method: string; reference?: string },
    @CurrentUser() user: CurrentUserType,
  ) {
    const organizationId = this.requireOrg(user);
    const expense = await this.expensesService.findOne(id);
    if (!expense || expense.organization_id !== organizationId) {
      throw new NotFoundException('Expense not found');
    }
    return this.expensesService.markAsPaid(
      id,
      new Date(body.paid_date),
      body.payment_method,
      body.reference,
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    const organizationId = this.requireOrg(user);
    const expense = await this.expensesService.findOne(id);
    if (!expense || expense.organization_id !== organizationId) {
      throw new NotFoundException('Expense not found');
    }
    await this.expensesService.delete(id);
    return { message: 'Expense deleted successfully' };
  }
}
