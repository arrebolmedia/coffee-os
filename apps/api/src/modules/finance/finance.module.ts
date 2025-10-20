import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { PermitsService } from './permits.service';
import { PnLService } from './pnl.service';
import { ExpensesController } from './expenses.controller';
import { PermitsController } from './permits.controller';
import { PnLController } from './pnl.controller';

@Module({
  controllers: [ExpensesController, PermitsController, PnLController],
  providers: [ExpensesService, PermitsService, PnLService],
  exports: [ExpensesService, PermitsService, PnLService],
})
export class FinanceModule {}
