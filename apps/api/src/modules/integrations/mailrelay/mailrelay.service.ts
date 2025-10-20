import { Injectable, Logger } from '@nestjs/common';

export interface MailrelayConfig {
  apiKey: string;
  apiUrl: string;
  defaultFromEmail: string;
  defaultFromName: string;
}

export interface EmailData {
  to: string | string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64
  type: string; // MIME type
}

export interface EmailResponse {
  messageId: string;
  status: 'queued' | 'sent' | 'failed';
  to: string[];
  error?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  variables: string[];
}

@Injectable()
export class MailrelayService {
  private readonly logger = new Logger(MailrelayService.name);
  private readonly config: MailrelayConfig;

  // Mock storage
  private mockSentEmails: Map<string, any> = new Map();
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.config = {
      apiKey: process.env.MAILRELAY_API_KEY || 'mock_api_key',
      apiUrl: process.env.MAILRELAY_API_URL || 'https://api.mailrelay.com/v1',
      defaultFromEmail:
        process.env.MAILRELAY_FROM_EMAIL || 'hola@cafeteria.mx',
      defaultFromName: process.env.MAILRELAY_FROM_NAME || 'Mi Cafetería',
    };

    this.initializeTemplates();
  }

  private initializeTemplates() {
    // Welcome email template
    this.templates.set('welcome', {
      id: 'welcome',
      name: 'Email de Bienvenida',
      subject: '¡Bienvenido a {{cafe_name}}! ☕',
      htmlContent: `
        <h1>¡Hola {{customer_name}}!</h1>
        <p>Gracias por unirte a {{cafe_name}}. Estamos emocionados de tenerte con nosotros.</p>
        <h2>Tu tarjeta de fidelidad 9+1 ya está activa</h2>
        <p>Por cada 9 cafés que compres, el 10° es GRATIS. ¡Así de simple!</p>
        <p>Te esperamos pronto ☕</p>
      `,
      variables: ['customer_name', 'cafe_name'],
    });

    // Birthday template
    this.templates.set('birthday', {
      id: 'birthday',
      name: 'Email de Cumpleaños',
      subject: '🎂 ¡Feliz Cumpleaños {{customer_name}}!',
      htmlContent: `
        <h1>¡Feliz Cumpleaños {{customer_name}}! 🎉</h1>
        <p>En tu día especial, queremos regalarte un café.</p>
        <p><strong>Tu regalo:</strong> 1 bebida GRATIS de tu elección</p>
        <p>Válido durante todo el mes de {{birth_month}}</p>
        <p>¡Que tengas un día maravilloso! ☕❤️</p>
      `,
      variables: ['customer_name', 'birth_month'],
    });

    // 9+1 Reward template
    this.templates.set('loyalty-reward', {
      id: 'loyalty-reward',
      name: 'Recompensa 9+1',
      subject: '🎁 ¡Tu café GRATIS te espera!',
      htmlContent: `
        <h1>¡Felicidades {{customer_name}}!</h1>
        <p>Has completado tu tarjeta 9+1. 🎉</p>
        <p><strong>Tu próximo café es GRATIS</strong></p>
        <p>Presenta este email en tu próxima visita para canjearlo.</p>
        <p>¡Gracias por tu preferencia! ☕</p>
      `,
      variables: ['customer_name'],
    });

    // Monthly newsletter template
    this.templates.set('newsletter', {
      id: 'newsletter',
      name: 'Newsletter Mensual',
      subject: '☕ Novedades del mes en {{cafe_name}}',
      htmlContent: `
        <h1>¡Hola {{customer_name}}!</h1>
        <h2>Novedades de {{month}}</h2>
        <p>{{newsletter_content}}</p>
        <h3>Promociones especiales:</h3>
        <ul>
          {{promotions_list}}
        </ul>
        <p>¡Te esperamos! ☕</p>
      `,
      variables: [
        'customer_name',
        'cafe_name',
        'month',
        'newsletter_content',
        'promotions_list',
      ],
    });
  }

  /**
   * Send email
   */
  async sendEmail(data: EmailData): Promise<EmailResponse> {
    this.logger.log(`Sending email to ${data.to}: ${data.subject}`);

    try {
      // In production, use Mailrelay API:
      // const response = await fetch(`${this.config.apiUrl}/emails`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.config.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     from: { email: data.fromEmail || this.config.defaultFromEmail },
      //     to: Array.isArray(data.to) ? data.to.map(email => ({ email })) : [{ email: data.to }],
      //     subject: data.subject,
      //     html: data.htmlContent,
      //   }),
      // });

      // Mock implementation
      const messageId = `EM${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      const toArray = Array.isArray(data.to) ? data.to : [data.to];

      const response: EmailResponse = {
        messageId,
        status: 'sent',
        to: toArray,
      };

      this.mockSentEmails.set(messageId, {
        ...response,
        ...data,
        sentAt: new Date(),
      });

      return response;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw new Error(`Email send failed: ${error.message}`);
    }
  }

  /**
   * Send email from template
   */
  async sendTemplateEmail(
    templateId: string,
    to: string | string[],
    variables: Record<string, string>,
  ): Promise<EmailResponse> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Replace variables in template
    let subject = template.subject;
    let htmlContent = template.htmlContent;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      htmlContent = htmlContent.replace(regex, value);
    }

    return this.sendEmail({
      to,
      subject,
      htmlContent,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    to: string,
    customerName: string,
    cafeName: string,
  ): Promise<EmailResponse> {
    return this.sendTemplateEmail('welcome', to, {
      customer_name: customerName,
      cafe_name: cafeName,
    });
  }

  /**
   * Send birthday email
   */
  async sendBirthdayEmail(
    to: string,
    customerName: string,
    birthMonth: string,
  ): Promise<EmailResponse> {
    return this.sendTemplateEmail('birthday', to, {
      customer_name: customerName,
      birth_month: birthMonth,
    });
  }

  /**
   * Send loyalty reward email
   */
  async sendLoyaltyRewardEmail(
    to: string,
    customerName: string,
  ): Promise<EmailResponse> {
    return this.sendTemplateEmail('loyalty-reward', to, {
      customer_name: customerName,
    });
  }

  /**
   * Send bulk emails (campaign)
   */
  async sendBulkEmails(
    recipients: { email: string; name: string; variables?: Record<string, string> }[],
    templateId: string,
    commonVariables: Record<string, string> = {},
  ): Promise<EmailResponse[]> {
    this.logger.log(
      `Sending bulk emails to ${recipients.length} recipients using template ${templateId}`,
    );

    const results: EmailResponse[] = [];

    for (const recipient of recipients) {
      try {
        const variables = {
          ...commonVariables,
          customer_name: recipient.name,
          ...recipient.variables,
        };

        const result = await this.sendTemplateEmail(
          templateId,
          recipient.email,
          variables,
        );

        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to send to ${recipient.email}: ${error.message}`,
        );
        results.push({
          messageId: '',
          status: 'failed',
          to: [recipient.email],
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get email status
   */
  async getEmailStatus(messageId: string): Promise<any> {
    return this.mockSentEmails.get(messageId) || null;
  }

  /**
   * List available templates
   */
  getTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add subscriber to list
   */
  async addSubscriber(
    email: string,
    name: string,
    listId: string = 'default',
  ): Promise<{ success: boolean; subscriberId: string }> {
    this.logger.log(`Adding subscriber ${email} to list ${listId}`);

    // In production, use Mailrelay API
    const subscriberId = `SUB${Date.now()}`;

    return {
      success: true,
      subscriberId,
    };
  }

  /**
   * Remove subscriber from list
   */
  async removeSubscriber(
    email: string,
    listId: string = 'default',
  ): Promise<{ success: boolean }> {
    this.logger.log(`Removing subscriber ${email} from list ${listId}`);

    return {
      success: true,
    };
  }
}
