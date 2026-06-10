import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryAutomationController } from './inventory-automation.controller';
import { InventoryService } from './inventory.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [InventoryController, InventoryAutomationController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
