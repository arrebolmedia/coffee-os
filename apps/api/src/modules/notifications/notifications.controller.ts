import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  CreatePreferenceDto,
  CreateBatchDto,
} from './dto';
import {
  Channel,
  NotificationStatus,
  NotificationPriority,
  TemplateCategory,
} from './interfaces';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // ==================== TEMPLATES ====================

  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Get('templates')
  findAllTemplates(
    @Query('organization_id') organization_id?: string,
    @Query('channel') channel?: Channel,
    @Query('category') category?: TemplateCategory,
    @Query('is_active') is_active?: string,
  ) {
    const isActiveBoolean = is_active === 'true' ? true : is_active === 'false' ? false : undefined;
    return this.service.findAllTemplates(
      organization_id,
      channel,
      category,
      isActiveBoolean,
    );
  }

  @Get('templates/:id')
  findTemplateById(@Param('id') id: string) {
    return this.service.findTemplateById(id);
  }

  @Get('templates/code/:code')
  findTemplateByCode(
    @Param('code') code: string,
    @Query('organization_id') organization_id: string,
  ) {
    return this.service.findTemplateByCode(organization_id, code);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTemplate(@Param('id') id: string) {
    return this.service.deleteTemplate(id);
  }

  // ==================== NOTIFICATIONS ====================

  @Post()
  createNotification(@Body() dto: CreateNotificationDto) {
    return this.service.createNotification(dto);
  }

  @Get()
  findAllNotifications(
    @Query('organization_id') organization_id?: string,
    @Query('user_id') user_id?: string,
    @Query('channel') channel?: Channel,
    @Query('status') status?: NotificationStatus,
    @Query('priority') priority?: NotificationPriority,
  ) {
    return this.service.findAllNotifications(
      organization_id,
      user_id,
      channel,
      status,
      priority,
    );
  }

  @Get('stats/:organization_id')
  getStats(@Param('organization_id') organization_id: string) {
    return this.service.getStats(organization_id);
  }

  @Get(':id')
  findNotificationById(@Param('id') id: string) {
    return this.service.findNotificationById(id);
  }

  @Get(':id/logs')
  getNotificationLogs(@Param('id') id: string) {
    return this.service.getNotificationLogs(id);
  }

  @Post(':id/send')
  sendNotification(@Param('id') id: string) {
    return this.service.sendNotification(id);
  }

  @Post(':id/retry')
  retryNotification(@Param('id') id: string) {
    return this.service.retryNotification(id);
  }

  @Patch(':id/delivered')
  markDelivered(@Param('id') id: string) {
    return this.service.markDelivered(id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.service.markRead(id);
  }

  @Patch(':id/bounced')
  markBounced(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.service.markBounced(id, reason);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNotification(@Param('id') id: string) {
    return this.service.deleteNotification(id);
  }

  // ==================== PREFERENCES ====================

  @Post('preferences')
  createPreference(@Body() dto: CreatePreferenceDto) {
    return this.service.createPreference(dto);
  }

  @Get('preferences/user/:user_id')
  findUserPreferences(
    @Param('user_id') user_id: string,
    @Query('organization_id') organization_id?: string,
  ) {
    return this.service.findUserPreferences(user_id, organization_id);
  }

  @Patch('preferences/:id')
  updatePreference(@Param('id') id: string, @Body() updates: any) {
    return this.service.updatePreference(id, updates);
  }

  @Delete('preferences/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePreference(@Param('id') id: string) {
    return this.service.deletePreference(id);
  }

  // ==================== BATCHES ====================

  @Post('batches')
  createBatch(@Body() dto: CreateBatchDto) {
    return this.service.createBatch(dto);
  }

  @Get('batches')
  findAllBatches(@Query('organization_id') organization_id?: string) {
    return this.service.findAllBatches(organization_id);
  }

  @Get('batches/:id')
  findBatchById(@Param('id') id: string) {
    return this.service.findBatchById(id);
  }

  @Post('batches/:id/process')
  processBatch(@Param('id') id: string) {
    return this.service.processBatch(id);
  }
}
