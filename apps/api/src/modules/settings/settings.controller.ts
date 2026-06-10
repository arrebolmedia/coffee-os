import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
  BulkUpdateDto,
  CreateSettingDto,
  CreateTemplateDto,
  ExportSettingsDto,
  ImportSettingsDto,
  QuerySettingsDto,
  SetValidationRuleDto,
  UpdateSettingDto,
} from './dto';
import { SettingCategory, ValidationRuleType } from './interfaces';

@Controller('settings')
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  // ========== BASIC CRUD ==========

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

  @Get('public/:organizationId')
  getPublicSettings(@Param('organizationId') organizationId: string) {
    return this.svc.getPublicSettings(organizationId);
  }

  @Get('category/:organizationId/:category')
  getByCategory(
    @Param('organizationId') organizationId: string,
    @Param('category') category: SettingCategory,
  ) {
    return this.svc.getByCategory(organizationId, category);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.svc.getHistory(id);
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

  // ========== BULK OPERATIONS ==========

  @Post('bulk/update')
  bulkUpdate(@Body() dto: BulkUpdateDto) {
    return this.svc.bulkUpdate(dto);
  }

  @Post('import')
  importSettings(@Body() dto: ImportSettingsDto) {
    return this.svc.importSettings(dto);
  }

  @Post('export')
  exportSettings(@Body() dto: ExportSettingsDto) {
    return this.svc.exportSettings(dto);
  }

  // ========== VALIDATION RULES ==========

  @Post(':id/validation')
  setValidationRule(
    @Param('id') id: string,
    @Body() dto: SetValidationRuleDto,
  ) {
    return this.svc.setValidationRule(id, dto);
  }

  @Delete(':id/validation/:ruleType')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeValidationRule(
    @Param('id') id: string,
    @Param('ruleType') ruleType: ValidationRuleType,
  ) {
    return this.svc.removeValidationRule(id, ruleType);
  }

  // ========== TEMPLATES ==========

  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.svc.createTemplate(dto);
  }

  @Get('templates')
  findAllTemplates(@Query('category') category?: SettingCategory) {
    return this.svc.findAllTemplates(category);
  }

  @Get('templates/:id')
  findTemplateById(@Param('id') id: string) {
    return this.svc.findTemplateById(id);
  }

  @Post('templates/:id/apply/:organizationId')
  applyTemplate(
    @Param('id') id: string,
    @Param('organizationId') organizationId: string,
  ) {
    return this.svc.applyTemplate(organizationId, id);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTemplate(@Param('id') id: string) {
    return this.svc.deleteTemplate(id);
  }

  // ========== INITIALIZATION ==========

  @Post('initialize/:organizationId')
  initializeDefaults(@Param('organizationId') organizationId: string) {
    return this.svc.initializeDefaults(organizationId);
  }
}
