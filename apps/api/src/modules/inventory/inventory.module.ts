import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryAutomationController } from './inventory-automation.controller';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [InventoryController, InventoryAutomationController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
