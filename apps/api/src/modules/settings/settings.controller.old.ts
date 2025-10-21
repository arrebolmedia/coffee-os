import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateSettingDto, UpdateSettingDto, QuerySettingsDto } from './dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  @Post()
  create(@Body() dto: CreateSettingDto) {
    return this.svc.create(dto);
  }

  @Get()
  findAll(@Query() query: QuerySettingsDto) {
    return this.svc.findAll(query);
  }

  @Get('stats/:organizationId')
  getStats(@Param('organizationId') organizationId: string) {
    return this.svc.getStats(organizationId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSettingDto) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/reset')
  resetToDefault(@Param('id') id: string) {
    return this.svc.resetToDefault(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
