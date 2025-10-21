import { Controller, Post, Get, Param, Body, Query, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, CreateTemplateDto } from './dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  // Templates
  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.svc.createTemplate(dto);
  }

  @Get('templates')
  findTemplates(@Query('organization_id') organization_id?: string) {
    return this.svc.findTemplates(organization_id);
  }

  @Get('templates/:id')
  findTemplateById(@Param('id') id: string) {
    return this.svc.findTemplateById(id);
  }

  // Notifications
  @Post()
  createNotification(@Body() dto: CreateNotificationDto) {
    return this.svc.createNotification(dto);
  }

  @Get()
  findAll(@Query('organization_id') organization_id?: string) {
    return this.svc.findAll(organization_id);
  }

  @Get('stats/:organization_id')
  getStats(@Param('organization_id') organization_id: string) {
    return this.svc.getStats(organization_id);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Post(':id/send')
  send(@Param('id') id: string) {
    return this.svc.sendNotification(id);
  }

  @Patch(':id/retry')
  retry(@Param('id') id: string) {
    return this.svc.retryNotification(id);
  }

  @Patch(':id/mark-delivered')
  markDelivered(@Param('id') id: string) {
    return this.svc.markDelivered(id);
  }

  @Patch(':id/mark-read')
  markRead(@Param('id') id: string) {
    return this.svc.markRead(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.svc.deleteNotification(id);
  }
}
