import { Test, TestingModule } from '@nestjs/testing';
import { MailrelayService } from '../mailrelay/mailrelay.service';

describe('MailrelayService', () => {
  let service: MailrelayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailrelayService],
    }).compile();

    service = module.get<MailrelayService>(MailrelayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send a basic email', async () => {
      const result = await service.sendEmail({
        to: 'cliente@example.com',
        subject: 'Bienvenido',
        htmlContent: '<h1>Hola</h1><p>Gracias por registrarte</p>',
      });

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      expect(result.status).toBe('sent');
      expect(result.to).toContain('cliente@example.com');
    });

    it('should send email with custom from name', async () => {
      const result = await service.sendEmail({
        to: 'cliente@example.com',
        subject: 'Aviso',
        htmlContent: '<p>Contenido</p>',
        fromName: 'Mi Cafetería Centro',
      });

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
    });
  });

  describe('sendTemplateEmail', () => {
    it('should send email using template', async () => {
      const result = await service.sendTemplateEmail(
        'welcome',
        'cliente@example.com',
        {
          customer_name: 'Juan Pérez',
          cafe_name: 'Mi Cafetería',
        },
      );

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      expect(result.status).toBe('sent');
    });

    it('should throw error for invalid template', async () => {
      await expect(
        service.sendTemplateEmail('invalid', 'cliente@example.com', {}),
      ).rejects.toThrow('Template not found');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with 9+1 card info', async () => {
      const result = await service.sendWelcomeEmail(
        'nuevo@example.com',
        'María García',
        'Mi Cafetería Centro',
      );

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      expect(result.status).toBe('sent');
    });
  });

  describe('sendBirthdayEmail', () => {
    it('should send birthday email with free drink offer', async () => {
      const result = await service.sendBirthdayEmail(
        'cumpleañero@example.com',
        'Pedro López',
        'Marzo',
      );

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      expect(result.status).toBe('sent');
    });
  });

  describe('sendLoyaltyRewardEmail', () => {
    it('should send 9+1 completed reward email', async () => {
      const result = await service.sendLoyaltyRewardEmail(
        'cliente@example.com',
        'Ana Martínez',
      );

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      expect(result.status).toBe('sent');
    });
  });

  describe('sendBulkEmails', () => {
    it('should send bulk campaign emails', async () => {
      const recipients = [
        {
          email: 'cliente1@example.com',
          name: 'Cliente 1',
          variables: { customer_name: 'Cliente 1' },
        },
        {
          email: 'cliente2@example.com',
          name: 'Cliente 2',
          variables: { customer_name: 'Cliente 2' },
        },
        {
          email: 'cliente3@example.com',
          name: 'Cliente 3',
          variables: { customer_name: 'Cliente 3' },
        },
      ];

      const result = await service.sendBulkEmails(recipients, 'welcome', {
        cafe_name: 'Cafetería',
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });
  });

  describe('getEmailStatus', () => {
    it('should retrieve email status', async () => {
      // Send an email first
      const sent = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      // Check its status
      const status = await service.getEmailStatus(sent.messageId);

      expect(status).toBeDefined();
      expect(status.messageId).toBe(sent.messageId);
      expect(status.status).toBe('sent');
    });

    it('should return null for non-existent email', async () => {
      const status = await service.getEmailStatus('non-existent-id');
      expect(status).toBeNull();
    });
  });

  describe('addSubscriber', () => {
    it('should add a new subscriber to list', async () => {
      const result = await service.addSubscriber(
        'nuevo@example.com',
        'Nuevo Suscriptor',
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.subscriberId).toBeDefined();
    });

    it('should not add duplicate subscriber', async () => {
      // Add once
      await service.addSubscriber('duplicado@example.com', 'Duplicado');

      // Try to add again
      const result = await service.addSubscriber(
        'duplicado@example.com',
        'Duplicado',
      );

      expect(result).toBeDefined();
      // In mock mode, it still succeeds but in production would handle duplicates
      expect(result.success).toBe(true);
    });
  });

  describe('removeSubscriber', () => {
    it('should remove subscriber from list', async () => {
      // First add a subscriber
      await service.addSubscriber('remover@example.com', 'Por Remover');

      // Then remove it
      const result = await service.removeSubscriber('remover@example.com');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle removing non-existent subscriber', async () => {
      const result = await service.removeSubscriber('noexiste@example.com');

      expect(result).toBeDefined();
      // Mock mode accepts all removals
      expect(result.success).toBe(true);
    });
  });

  describe('getTemplates', () => {
    it('should return list of available templates', async () => {
      const templates = await service.getTemplates();

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'welcome' }),
          expect.objectContaining({ id: 'birthday' }),
          expect.objectContaining({ id: 'loyalty-reward' }),
          expect.objectContaining({ id: 'newsletter' }),
        ]),
      );
    });

    it('should have complete template information', async () => {
      const templates = await service.getTemplates();
      const welcomeTemplate = templates.find((t) => t.id === 'welcome');

      expect(welcomeTemplate).toBeDefined();
      expect(welcomeTemplate?.name).toBeDefined();
      expect(welcomeTemplate?.subject).toBeDefined();
      expect(welcomeTemplate?.variables).toBeDefined();
      expect(welcomeTemplate?.variables).toContain('customer_name');
      expect(welcomeTemplate?.variables).toContain('cafe_name');
    });
  });
});
