import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryAutomationController } from './inventory-automation.controller';
import { InventoryService } from './inventory.service';
import { InventoryAutomationService } from './inventory-automation.service';
import { AutoDeductConfigService } from './auto-deduct-config.service';
import { TheoreticalStockService } from './theoretical-stock.service';
import { StockReconciliationService } from './stock-reconciliation.service';
import { RecipeInventoryLinksService } from './recipe-inventory-links.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [InventoryController, InventoryAutomationController],
  providers: [
    InventoryService,
    InventoryAutomationService,
    AutoDeductConfigService,
    TheoreticalStockService,
    StockReconciliationService,
    RecipeInventoryLinksService,
  ],
  // `InventoryAutomationService` is exported so the order lifecycle can call
  // `deductForOrder()` when an order reaches COMPLETED/SERVED.
  exports: [
    InventoryService,
    InventoryAutomationService,
    TheoreticalStockService,
    StockReconciliationService,
    RecipeInventoryLinksService,
  ],
})
export class InventoryModule {}
