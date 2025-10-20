import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { CreateLoyaltyTransactionDto, QueryLoyaltyTransactionsDto } from './dto';

@Controller('crm/loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Post('transactions')
  @HttpCode(HttpStatus.CREATED)
  async createTransaction(@Body() createDto: CreateLoyaltyTransactionDto) {
    return this.loyaltyService.createTransaction(createDto);
  }

  @Post('earn')
  @HttpCode(HttpStatus.CREATED)
  async earnPoints(@Body() body: { customer_id: string; organization_id: string; order_total: number; order_id?: string }) {
    return this.loyaltyService.earnPoints(
      body.customer_id,
      body.organization_id,
      body.order_total,
      body.order_id,
    );
  }

  @Post('redeem')
  @HttpCode(HttpStatus.CREATED)
  async redeemPoints(@Body() body: { customer_id: string; organization_id: string; reward_id: string; processed_by_user_id: string }) {
    return this.loyaltyService.redeemPoints(
      body.customer_id,
      body.organization_id,
      body.reward_id,
      body.processed_by_user_id,
    );
  }

  @Get('check-9plus1/:customerId')
  async check9Plus1(@Param('customerId') customerId: string) {
    return this.loyaltyService.checkLoyalty9Plus1(customerId);
  }

  @Get('transactions')
  async findAll(@Query() query: QueryLoyaltyTransactionsDto) {
    return this.loyaltyService.findAll(query);
  }

  @Get('transactions/:id')
  async findOne(@Param('id') id: string) {
    const transaction = await this.loyaltyService.findOne(id);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return transaction;
  }

  @Get('balance/:customerId')
  async getBalance(@Param('customerId') customerId: string) {
    return this.loyaltyService.getBalance(customerId);
  }

  @Get('stats')
  async getStats(@Query('organization_id') organizationId: string) {
    return this.loyaltyService.getStats(organizationId || 'org_default');
  }

  // Rewards endpoints
  @Post('rewards')
  @HttpCode(HttpStatus.CREATED)
  async createReward(@Body() body: any) {
    return this.loyaltyService.createReward(body.organization_id || 'org_default', body);
  }

  @Get('rewards')
  async findAllRewards(@Query('organization_id') organizationId: string) {
    return this.loyaltyService.findAllRewards(organizationId || 'org_default');
  }

  @Get('rewards/:id')
  async findReward(@Param('id') id: string) {
    const reward = await this.loyaltyService.findReward(id);
    if (!reward) {
      throw new Error('Reward not found');
    }
    return reward;
  }

  @Patch('rewards/:id')
  async updateReward(@Param('id') id: string, @Body() updateData: any) {
    return this.loyaltyService.updateReward(id, updateData);
  }

  @Delete('rewards/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReward(@Param('id') id: string) {
    await this.loyaltyService.deleteReward(id);
  }
}
