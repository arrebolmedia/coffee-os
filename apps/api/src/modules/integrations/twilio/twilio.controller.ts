import { Controller, Post, Body, Get, Param, HttpCode } from '@nestjs/common';
import { TwilioService, WhatsAppMessage, SMSMessage } from './twilio.service';

@Controller('integrations/twilio')
export class TwilioController {
  constructor(private readonly twilioService: TwilioService) {}

  @Post('whatsapp')
  @HttpCode(200)
  async sendWhatsApp(@Body() data: WhatsAppMessage) {
    return this.twilioService.sendWhatsApp(data);
  }

  @Post('sms')
  @HttpCode(200)
  async sendSMS(@Body() data: SMSMessage) {
    return this.twilioService.sendSMS(data);
  }

  @Post('birthday')
  @HttpCode(200)
  async sendBirthdayGreeting(
    @Body() data: { to: string; customerName: string },
  ) {
    return this.twilioService.sendBirthdayGreeting(data.to, data.customerName);
  }

  @Post('loyalty-reward')
  @HttpCode(200)
  async sendLoyaltyReward(
    @Body()
    data: {
      to: string;
      customerName: string;
      rewardType: '9+1' | 'birthday' | 'special';
    },
  ) {
    return this.twilioService.sendLoyaltyReward(
      data.to,
      data.customerName,
      data.rewardType,
    );
  }

  @Post('order-ready')
  @HttpCode(200)
  async sendOrderReady(
    @Body() data: { to: string; customerName: string; orderNumber: string },
  ) {
    return this.twilioService.sendOrderReady(
      data.to,
      data.customerName,
      data.orderNumber,
    );
  }

  @Post('campaign')
  @HttpCode(200)
  async sendCampaign(
    @Body()
    data: {
      to: string;
      customerName: string;
      campaignMessage: string;
      imageUrl?: string;
    },
  ) {
    return this.twilioService.sendCampaign(
      data.to,
      data.customerName,
      data.campaignMessage,
      data.imageUrl,
    );
  }

  @Get('status/:sid')
  async getMessageStatus(@Param('sid') sid: string) {
    return this.twilioService.getMessageStatus(sid);
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() webhookData: any) {
    return this.twilioService.handleIncomingMessage(webhookData);
  }
}
