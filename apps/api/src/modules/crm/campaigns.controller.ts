import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, QueryCampaignsDto, CampaignStatus, CampaignChannel } from './dto';

@Controller('crm/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateCampaignDto) {
    // In production, createdByUserId would come from authenticated user
    return this.campaignsService.create(createDto, 'user_default');
  }

  @Get()
  async findAll(@Query() query: QueryCampaignsDto) {
    return this.campaignsService.findAll(query);
  }

  @Get('stats')
  async getStats(@Query('organization_id') organizationId: string) {
    return this.campaignsService.getStats(organizationId || 'org_default');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const campaign = await this.campaignsService.findOne(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    return campaign;
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: CampaignStatus }) {
    return this.campaignsService.updateStatus(id, body.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.campaignsService.delete(id);
  }

  @Post(':id/recipients')
  @HttpCode(HttpStatus.CREATED)
  async addRecipient(@Param('id') campaignId: string, @Body() body: { customer_id: string; channel: CampaignChannel }) {
    return this.campaignsService.addRecipient(campaignId, body.customer_id, body.channel);
  }

  @Get(':id/recipients')
  async getCampaignRecipients(@Param('id') campaignId: string) {
    return this.campaignsService.getCampaignRecipients(campaignId);
  }

  @Post('recipients/:recipientId/sent')
  @HttpCode(HttpStatus.OK)
  async markSent(@Param('recipientId') recipientId: string) {
    await this.campaignsService.markSent(recipientId);
    return { message: 'Marked as sent' };
  }

  @Post('recipients/:recipientId/delivered')
  @HttpCode(HttpStatus.OK)
  async markDelivered(@Param('recipientId') recipientId: string) {
    await this.campaignsService.markDelivered(recipientId);
    return { message: 'Marked as delivered' };
  }

  @Post('recipients/:recipientId/opened')
  @HttpCode(HttpStatus.OK)
  async markOpened(@Param('recipientId') recipientId: string) {
    await this.campaignsService.markOpened(recipientId);
    return { message: 'Marked as opened' };
  }

  @Post('recipients/:recipientId/clicked')
  @HttpCode(HttpStatus.OK)
  async markClicked(@Param('recipientId') recipientId: string) {
    await this.campaignsService.markClicked(recipientId);
    return { message: 'Marked as clicked' };
  }

  @Post('recipients/:recipientId/converted')
  @HttpCode(HttpStatus.OK)
  async markConverted(@Param('recipientId') recipientId: string) {
    await this.campaignsService.markConverted(recipientId);
    return { message: 'Marked as converted' };
  }

  @Post('recipients/:recipientId/unsubscribed')
  @HttpCode(HttpStatus.OK)
  async markUnsubscribed(@Param('recipientId') recipientId: string) {
    await this.campaignsService.markUnsubscribed(recipientId);
    return { message: 'Marked as unsubscribed' };
  }

  // Automated campaigns
  @Post('birthday')
  @HttpCode(HttpStatus.CREATED)
  async createBirthdayCampaign(@Body() body: { organization_id: string }) {
    return this.campaignsService.createBirthdayCampaign(body.organization_id);
  }

  @Post('welcome')
  @HttpCode(HttpStatus.CREATED)
  async createWelcomeCampaign(@Body() body: { organization_id: string }) {
    return this.campaignsService.createWelcomeCampaign(body.organization_id);
  }
}
