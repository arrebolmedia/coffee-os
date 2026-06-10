import { Injectable, Logger } from '@nestjs/common';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `${name} environment variable is required and must not be empty`,
    );
  }
  return value;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  whatsappFrom: string; // whatsapp:+14155238886
  smsFrom: string; // +1234567890
}

export interface WhatsAppMessage {
  to: string; // whatsapp:+521234567890
  message: string;
  mediaUrl?: string;
}

export interface SMSMessage {
  to: string; // +521234567890
  message: string;
}

export interface TwilioResponse {
  sid: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  to: string;
  from: string;
  body: string;
  error?: string;
}

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private readonly config: TwilioConfig;

  // Mock Twilio client - in production, use actual Twilio SDK
  private mockMessages: Map<string, any> = new Map();

  constructor() {
    this.config = {
      accountSid: requireEnv('TWILIO_ACCOUNT_SID'),
      authToken: requireEnv('TWILIO_AUTH_TOKEN'),
      whatsappFrom: requireEnv('TWILIO_WHATSAPP_FROM'),
      smsFrom: requireEnv('TWILIO_SMS_FROM'),
    };
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(data: WhatsAppMessage): Promise<TwilioResponse> {
    this.logger.log(`Sending WhatsApp to ${data.to}: ${data.message}`);

    try {
      // In production, use Twilio SDK:
      // const client = require('twilio')(this.config.accountSid, this.config.authToken);
      // const message = await client.messages.create({
      //   from: this.config.whatsappFrom,
      //   to: data.to,
      //   body: data.message,
      //   mediaUrl: data.mediaUrl,
      // });

      // Mock implementation
      const sid = `WA${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      const response: TwilioResponse = {
        sid,
        status: 'sent',
        to: data.to,
        from: this.config.whatsappFrom,
        body: data.message,
      };

      this.mockMessages.set(sid, {
        ...response,
        mediaUrl: data.mediaUrl,
        createdAt: new Date(),
      });

      return response;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp: ${error.message}`);
      throw new Error(`WhatsApp send failed: ${error.message}`);
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(data: SMSMessage): Promise<TwilioResponse> {
    this.logger.log(`Sending SMS to ${data.to}: ${data.message}`);

    try {
      // Mock implementation
      const sid = `SM${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      const response: TwilioResponse = {
        sid,
        status: 'sent',
        to: data.to,
        from: this.config.smsFrom,
        body: data.message,
      };

      this.mockMessages.set(sid, {
        ...response,
        createdAt: new Date(),
      });

      return response;
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      throw new Error(`SMS send failed: ${error.message}`);
    }
  }

  /**
   * Send birthday greeting via WhatsApp
   */
  async sendBirthdayGreeting(
    to: string,
    customerName: string,
  ): Promise<TwilioResponse> {
    const message =
      `🎂 ¡Feliz Cumpleaños ${customerName}! 🎉\n\n` +
      `En tu día especial, queremos regalarte un café. ` +
      `Muestra este mensaje en cualquiera de nuestras sucursales y ` +
      `disfruta de tu bebida favorita por nuestra cuenta.\n\n` +
      `¡Que tengas un día maravilloso! ☕❤️`;

    return this.sendWhatsApp({ to, message });
  }

  /**
   * Send loyalty reward notification
   */
  async sendLoyaltyReward(
    to: string,
    customerName: string,
    rewardType: '9+1' | 'birthday' | 'special',
  ): Promise<TwilioResponse> {
    let message = `¡Hola ${customerName}! 🎁\n\n`;

    if (rewardType === '9+1') {
      message +=
        `¡Felicidades! Has completado tu tarjeta 9+1. ` +
        `Tu próximo café es GRATIS. 🎉\n\n` +
        `Muestra este mensaje en tu próxima visita.`;
    } else if (rewardType === 'birthday') {
      message +=
        `¡Es tu mes de cumpleaños! 🎂\n\n` +
        `Disfruta de un café GRATIS durante todo el mes. ` +
        `Solo muestra este mensaje al pagar.`;
    } else {
      message +=
        `Tenemos una promoción especial para ti. ` +
        `Visítanos pronto y disfruta de beneficios exclusivos.`;
    }

    message += `\n\n¡Te esperamos! ☕`;

    return this.sendWhatsApp({ to, message });
  }

  /**
   * Send order ready notification
   */
  async sendOrderReady(
    to: string,
    customerName: string,
    orderNumber: string,
  ): Promise<TwilioResponse> {
    const message =
      `¡Hola ${customerName}! ☕\n\n` +
      `Tu orden #${orderNumber} está lista para recoger.\n\n` +
      `Te esperamos en caja. ¡Gracias!`;

    return this.sendWhatsApp({ to, message });
  }

  /**
   * Send marketing campaign via WhatsApp
   */
  async sendCampaign(
    to: string,
    customerName: string,
    campaignMessage: string,
    imageUrl?: string,
  ): Promise<TwilioResponse> {
    const message = `¡Hola ${customerName}! ☕\n\n${campaignMessage}`;

    return this.sendWhatsApp({
      to,
      message,
      mediaUrl: imageUrl,
    });
  }

  /**
   * Get message status
   */
  async getMessageStatus(sid: string): Promise<TwilioResponse | null> {
    const message = this.mockMessages.get(sid);
    return message || null;
  }

  /**
   * Webhook handler for incoming messages
   */
  async handleIncomingMessage(webhookData: any): Promise<any> {
    this.logger.log('Received incoming message:', webhookData);

    // In production, process incoming messages
    // - Save to database
    // - Trigger automated responses
    // - Update customer interactions

    return {
      received: true,
      from: webhookData.From,
      body: webhookData.Body,
      processedAt: new Date(),
    };
  }
}
