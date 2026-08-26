import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import {
  CampaignChannel,
  CampaignStatus,
  CreateCampaignDto,
  QueryCampaignsDto,
} from './dto';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';

@Controller('crm/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateCampaignDto,
    @CurrentOrg() organizationId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    // La organización y el autor salen del JWT, nunca del body.
    return this.campaignsService.create(
      { ...createDto, organization_id: organizationId },
      user.userId,
    );
  }

  @Get()
  async findAll(
    @Query() query: QueryCampaignsDto,
    @CurrentOrg() organizationId: string,
  ) {
    return this.campaignsService.findAll({
      ...query,
      organization_id: organizationId,
    });
  }

  @Get('stats')
  async getStats(@CurrentOrg() organizationId: string) {
    return this.campaignsService.getStats(organizationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentOrg() organizationId: string) {
    const campaign = await this.campaignsService.findOne(id, organizationId);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }
    return campaign;
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: CampaignStatus },
    @CurrentOrg() organizationId: string,
  ) {
    return this.campaignsService.updateStatus(id, body.status, organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentOrg() organizationId: string) {
    await this.campaignsService.delete(id, organizationId);
  }

  @Post(':id/recipients')
  @HttpCode(HttpStatus.CREATED)
  async addRecipient(
    @Param('id') campaignId: string,
    @Body() body: { customer_id: string; channel: CampaignChannel },
  ) {
    return this.campaignsService.addRecipient(
      campaignId,
      body.customer_id,
      body.channel,
    );
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
  async createBirthdayCampaign(@CurrentOrg() organizationId: string) {
    return this.campaignsService.createBirthdayCampaign(organizationId);
  }

  @Post('welcome')
  @HttpCode(HttpStatus.CREATED)
  async createWelcomeCampaign(@CurrentOrg() organizationId: string) {
    return this.campaignsService.createWelcomeCampaign(organizationId);
  }
}
