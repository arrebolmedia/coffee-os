import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Módulo aplazado de forma indefinida por decisión del dueño (2 de septiembre
 * de 2026). Ni WhatsApp ni SMS se mandan desde el sistema.
 *
 * Aquí NUNCA hubo un cliente de Twilio: `sendWhatsApp` inventaba un SID
 * (`WA${Date.now()}...`), devolvía `status: 'sent'` y no salía nada. Y aun así
 * el constructor exigía credenciales reales, así que la aplicación ENTERA se
 * negaba a arrancar sin unas claves que después no usaba para nada. Las 97
 * pruebas de integración caían por eso en el runner de CI.
 *
 * Se trata igual que el timbrado sin PAC, que es el precedente de esta misma
 * casa: el servicio se construye siempre, y el intento de enviar falla con un
 * mensaje que dice exactamente qué pasa. Fingir un envío es peor que no
 * tenerlo — alguien confía en que al cliente le llegó su aviso.
 */
const TWILIO_APLAZADO =
  'El envío de WhatsApp y SMS está aplazado de forma indefinida: no hay ' +
  'cliente de Twilio integrado, sólo un simulador que devolvía "enviado" sin ' +
  'mandar nada. No se envió ningún mensaje.';

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

  constructor() {
    // Sin `requireEnv`: el servicio se construye siempre. Las credenciales se
    // leen por si algún día se integra de verdad, pero su ausencia no puede
    // impedir que arranque un punto de venta.
    this.config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
      authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
      whatsappFrom: process.env.TWILIO_WHATSAPP_FROM ?? '',
      smsFrom: process.env.TWILIO_SMS_FROM ?? '',
    };
  }

  /** Corta cualquier intento de envío, en vez de simularlo. */
  private aplazado(destino: string): never {
    this.logger.error(`Envío a ${destino} bloqueado: ${TWILIO_APLAZADO}`);
    throw new ServiceUnavailableException(TWILIO_APLAZADO);
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(data: WhatsAppMessage): Promise<TwilioResponse> {
    return this.aplazado(data.to);
  }

  /**
   * Send SMS message
   */
  async sendSMS(data: SMSMessage): Promise<TwilioResponse> {
    return this.aplazado(data.to);
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
   * El estado de un mensaje.
   *
   * Leia de un `Map` en memoria que sólo contenía lo que el propio simulador
   * habia inventado un momento antes. No hay ningún mensaje del que informar.
   */
  async getMessageStatus(sid: string): Promise<TwilioResponse | null> {
    return this.aplazado(`consulta del mensaje ${sid}`);
  }

  /**
   * Webhook de mensajes entrantes.
   *
   * Devolvía `received: true` con la fecha, sin guardar nada ni hacer nada:
   * quien lo llamara se quedaba creyendo que el mensaje del cliente estaba
   * registrado.
   */
  async handleIncomingMessage(webhookData: any): Promise<any> {
    return this.aplazado(
      `mensaje entrante de ${webhookData?.From ?? 'origen desconocido'}`,
    );
  }
}
