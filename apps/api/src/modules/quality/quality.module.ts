import { Module } from '@nestjs/common';
import { ChecklistsController } from './checklists.controller';
import { TemperatureLogsController } from './temperature-logs.controller';
import { FoodSafetyController } from './food-safety.controller';
import { ChecklistsService } from './checklists.service';
import { TemperatureLogsService } from './temperature-logs.service';
import { FoodSafetyService } from './food-safety.service';

@Module({
  controllers: [ChecklistsController, TemperatureLogsController, FoodSafetyController],
  providers: [ChecklistsService, TemperatureLogsService, FoodSafetyService],
  exports: [ChecklistsService, TemperatureLogsService, FoodSafetyService],
})
export class QualityModule {}
