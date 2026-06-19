import { Module } from '@nestjs/common';
import { WasteService } from './waste.service';
import { WasteController } from './waste.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WasteController],
  providers: [WasteService],
  exports: [WasteService],
})
export class WasteModule {}
