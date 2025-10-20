import { Test, TestingModule } from '@nestjs/testing';
import { TwilioService } from '../twilio/twilio.service';

describe('TwilioService', () => {
  let service: TwilioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TwilioService],
    }).compile();

    service = module.get<TwilioService>(TwilioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendWhatsApp', () => {
    it('should send a WhatsApp message', async () => {
      const result = await service.sendWhatsApp({
        to: '+521234567890',
        message: 'Hola desde CoffeeOS',
      });

      expect(result).toBeDefined();
      expect(result.sid).toBeDefined();
      expect(result.status).toBe('sent');
      expect(result.to).toContain('521234567890');
    });

    it('should send a WhatsApp message with media', async () => {
      const result = await service.sendWhatsApp({
        to: '+521234567890',
        message: 'Foto del producto',
        mediaUrl: 'https://example.com/image.jpg',
      });

      expect(result).toBeDefined();
      expect(result.sid).toBeDefined();
    });
  });

  describe('sendSMS', () => {
    it('should send an SMS message', async () => {
      const result = await service.sendSMS({
        to: '+521234567890',
        message: 'Hola desde CoffeeOS',
      });

      expect(result).toBeDefined();
      expect(result.sid).toBeDefined();
      expect(result.status).toBe('sent');
      expect(result.to).toBe('+521234567890');
    });
  });

  describe('sendBirthdayGreeting', () => {
    it('should send a birthday greeting', async () => {
      const result = await service.sendBirthdayGreeting(
        '+521234567890',
        'Juan Pérez',
      );

      expect(result).toBeDefined();
      expect(result.body).toContain('Feliz Cumpleaños');
      expect(result.body).toContain('Juan Pérez');
    });
  });

  describe('sendLoyaltyReward', () => {
    it('should send 9+1 loyalty reward notification', async () => {
      const result = await service.sendLoyaltyReward(
        '+521234567890',
        'María García',
        '9+1',
      );

      expect(result).toBeDefined();
      expect(result.body).toContain('GRATIS');
      expect(result.body).toContain('María García');
    });

    it('should send birthday month reward notification', async () => {
      const result = await service.sendLoyaltyReward(
        '+521234567890',
        'Pedro López',
        'birthday',
      );

      expect(result).toBeDefined();
      expect(result.body).toContain('mes de cumpleaños');
      expect(result.body).toContain('Pedro López');
    });

    it('should send special offer notification', async () => {
      const result = await service.sendLoyaltyReward(
        '+521234567890',
        'Ana Martínez',
        'special',
      );

      expect(result).toBeDefined();
      expect(result.body).toContain('promoción especial');
      expect(result.body).toContain('Ana Martínez');
    });
  });

  describe('sendOrderReady', () => {
    it('should send order ready notification', async () => {
      const result = await service.sendOrderReady(
        '+521234567890',
        '12345',
        'Mi Cafetería Centro',
      );

      expect(result).toBeDefined();
      expect(result.body).toContain('orden');
      expect(result.body).toContain('12345');
      expect(result.body).toContain('Mi Cafetería Centro');
    });
  });

  describe('sendCampaign', () => {
    it('should send marketing campaign message', async () => {
      const result = await service.sendCampaign(
        '+521234567890',
        '¡Nueva promoción!',
        '2x1 en café americano todo el día.',
        'https://example.com/promo.jpg',
      );

      expect(result).toBeDefined();
      expect(result.body).toContain('Nueva promoción');
      expect(result.body).toContain('2x1 en café americano');
    });

    it('should send campaign without image', async () => {
      const result = await service.sendCampaign(
        '+521234567890',
        'Aviso',
        'Mañana cerramos temprano.',
      );

      expect(result).toBeDefined();
      expect(result.body).toBeDefined();
    });
  });

  describe('getMessageStatus', () => {
    it('should retrieve message status', async () => {
      // First send a message
      const sentMessage = await service.sendSMS({
        to: '+521234567890',
        message: 'Test message',
      });

      // Then check its status
      const status = await service.getMessageStatus(sentMessage.sid);

      expect(status).toBeDefined();
      expect(status.sid).toBe(sentMessage.sid);
      expect(status.status).toBe('sent');
    });

    it('should return null for non-existent message', async () => {
      const status = await service.getMessageStatus('non-existent-sid');
      expect(status).toBeNull();
    });
  });

  describe('handleIncomingMessage', () => {
    it('should handle incoming WhatsApp message', async () => {
      const result = await service.handleIncomingMessage({
        From: 'whatsapp:+521234567890',
        Body: 'Hola',
      });

      expect(result).toBeDefined();
      expect(result.received).toBe(true);
      expect(result.body).toBe('Hola');
      expect(result.processedAt).toBeDefined();
    });

    it('should handle incoming SMS message', async () => {
      const result = await service.handleIncomingMessage({
        From: '+521234567890',
        Body: 'INFO',
      });

      expect(result).toBeDefined();
      expect(result.received).toBe(true);
      expect(result.body).toBe('INFO');
      expect(result.processedAt).toBeDefined();
    });
  });
});
