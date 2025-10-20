import { Controller, Post, Body, Get, Param, HttpCode, Delete } from '@nestjs/common';
import { MailrelayService, EmailData } from './mailrelay.service';

@Controller('integrations/mailrelay')
export class MailrelayController {
  constructor(private readonly mailrelayService: MailrelayService) {}

  @Post('send')
  @HttpCode(200)
  async sendEmail(@Body() data: EmailData) {
    return this.mailrelayService.sendEmail(data);
  }

  @Post('template/:templateId')
  @HttpCode(200)
  async sendTemplateEmail(
    @Param('templateId') templateId: string,
    @Body() data: { to: string | string[]; variables: Record<string, string> },
  ) {
    return this.mailrelayService.sendTemplateEmail(
      templateId,
      data.to,
      data.variables,
    );
  }

  @Post('welcome')
  @HttpCode(200)
  async sendWelcomeEmail(
    @Body() data: { to: string; customerName: string; cafeName: string },
  ) {
    return this.mailrelayService.sendWelcomeEmail(
      data.to,
      data.customerName,
      data.cafeName,
    );
  }

  @Post('birthday')
  @HttpCode(200)
  async sendBirthdayEmail(
    @Body() data: { to: string; customerName: string; birthMonth: string },
  ) {
    return this.mailrelayService.sendBirthdayEmail(
      data.to,
      data.customerName,
      data.birthMonth,
    );
  }

  @Post('loyalty-reward')
  @HttpCode(200)
  async sendLoyaltyRewardEmail(
    @Body() data: { to: string; customerName: string },
  ) {
    return this.mailrelayService.sendLoyaltyRewardEmail(
      data.to,
      data.customerName,
    );
  }

  @Post('bulk')
  @HttpCode(200)
  async sendBulkEmails(
    @Body()
    data: {
      recipients: {
        email: string;
        name: string;
        variables?: Record<string, string>;
      }[];
      templateId: string;
      commonVariables?: Record<string, string>;
    },
  ) {
    return this.mailrelayService.sendBulkEmails(
      data.recipients,
      data.templateId,
      data.commonVariables,
    );
  }

  @Get('status/:messageId')
  async getEmailStatus(@Param('messageId') messageId: string) {
    return this.mailrelayService.getEmailStatus(messageId);
  }

  @Get('templates')
  async getTemplates() {
    return this.mailrelayService.getTemplates();
  }

  @Post('subscribers')
  @HttpCode(201)
  async addSubscriber(
    @Body() data: { email: string; name: string; listId?: string },
  ) {
    return this.mailrelayService.addSubscriber(
      data.email,
      data.name,
      data.listId,
    );
  }

  @Delete('subscribers/:email')
  async removeSubscriber(
    @Param('email') email: string,
    @Body() data?: { listId?: string },
  ) {
    return this.mailrelayService.removeSubscriber(email, data?.listId);
  }
}
