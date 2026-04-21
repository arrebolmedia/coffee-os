import { Module } from '@nestjs/common';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { DatabaseModule } from '../database/database.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [DatabaseModule, CategoriesModule],
  controllers: [RecipesController],
  providers: [RecipesService],
  exports: [RecipesService],
})
export class RecipesModule {}
