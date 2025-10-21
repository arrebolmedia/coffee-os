import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import { CreateTemplateDto, CreateNotificationDto } from '../dto';
import { Channel, NotificationStatus } from '../interfaces';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const orgId = 'org-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    (service as any).templates.clear();
    (service as any).notifications.clear();
  });

  describe('createTemplate', () => {
    it('should create a template with all fields', async () => {
      const dto: CreateTemplateDto = {
        organization_id: orgId,
        code: 'WELCOME_1',
        name: 'Welcome Email',
        channel: Channel.EMAIL,
        subject: 'Bienvenido {{user_name}}',
        body: '<p>Hola {{user_name}}</p>',
        variables: ['user_name'],
      };

      const tpl = await service.createTemplate(dto);
      expect(tpl).toBeDefined();
      expect(tpl.id).toBeDefined();
      expect(tpl.code).toBe('WELCOME_1');
      expect(tpl.channel).toBe(Channel.EMAIL);
      expect(tpl.variables).toEqual(['user_name']);
      expect(tpl.created_at).toBeInstanceOf(Date);
    });

    it('should throw ConflictException if code exists', async () => {
      await service.createTemplate({
        organization_id: orgId,
        code: 'DUP',
        name: 'Test',
        channel: Channel.EMAIL,
        body: 'test',
      });

      await expect(
        service.createTemplate({
          organization_id: orgId,
          code: 'DUP',
          name: 'Test 2',
          channel: Channel.SMS,
          body: 'test',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow same code in different orgs', async () => {
      await service.createTemplate({
        organization_id: orgId,
        code: 'SAME',
        name: 'Test',
        channel: Channel.EMAIL,
        body: 'test',
      });

      const tpl2 = await service.createTemplate({
        organization_id: 'org-456',
        code: 'SAME',
        name: 'Test 2',
        channel: Channel.SMS,
        body: 'test',
      });

      expect(tpl2.code).toBe('SAME');
    });
  });

  describe('findTemplates', () => {
    beforeEach(async () => {
      await service.createTemplate({
        organization_id: orgId,
        code: 'T1',
        name: 'Template 1',
        channel: Channel.EMAIL,
        body: 'body1',
      });
      await service.createTemplate({
        organization_id: orgId,
        code: 'T2',
        name: 'Template 2',
        channel: Channel.SMS,
        body: 'body2',
      });
      await service.createTemplate({
        organization_id: 'org-456',
        code: 'T3',
        name: 'Template 3',
        channel: Channel.EMAIL,
        body: 'body3',
      });
    });

    it('should return all templates', async () => {
      const result = await service.findTemplates();
      expect(result).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findTemplates(orgId);
      expect(result).toHaveLength(2);
    });
  });

  describe('findTemplateById', () => {
    it('should return template by id', async () => {
      const created = await service.createTemplate({
        organization_id: orgId,
        code: 'FIND',
        name: 'Find Me',
        channel: Channel.EMAIL,
        body: 'test',
      });

      const result = await service.findTemplateById(created.id);
      expect(result.id).toBe(created.id);
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(service.findTemplateById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createNotification', () => {
    it('should create notification without template', async () => {
      const dto: CreateNotificationDto = {
        organization_id: orgId,
        channel: Channel.SMS,
        to: '+5215555555555',
        body: 'Hola mundo',
      };

      const notif = await service.createNotification(dto);
      expect(notif).toBeDefined();
      expect(notif.channel).toBe(Channel.SMS);
      expect(notif.to).toBe('+5215555555555');
      expect(notif.body).toBe('Hola mundo');
      expect(notif.status).toBe(NotificationStatus.PENDING);
      expect(notif.attempts).toBe(0);
    });

    it('should create notification with template and interpolate', async () => {
      const tpl = await service.createTemplate({
        organization_id: orgId,
        code: 'WELCOME',
        name: 'Welcome',
        channel: Channel.EMAIL,
        subject: 'Hola {{name}}',
        body: 'Bienvenido {{name}}, tu código es {{code}}',
      });

      const dto: CreateNotificationDto = {
        organization_id: orgId,
        channel: Channel.EMAIL,
        to: 'user@example.com',
        template_id: tpl.id,
        data: { name: 'Carlos', code: '1234' },
      };

      const notif = await service.createNotification(dto);
      expect(notif.body).toBe('Bienvenido Carlos, tu código es 1234');
      expect(notif.subject).toBe('Hola Carlos');
    });

    it('should create scheduled notification', async () => {
      const scheduled = new Date('2025-12-31');
      const dto: CreateNotificationDto = {
        organization_id: orgId,
        channel: Channel.EMAIL,
        to: 'user@example.com',
        body: 'test',
        scheduled_at: scheduled,
      };

      const notif = await service.createNotification(dto);
      expect(notif.status).toBe(NotificationStatus.SCHEDULED);
      expect(notif.scheduled_at).toEqual(scheduled);
    });

    it('should throw NotFoundException if template not found', async () => {
      await expect(
        service.createNotification({
          organization_id: orgId,
          channel: Channel.EMAIL,
          to: 'test@test.com',
          template_id: 'non-existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.createNotification({
        organization_id: orgId,
        channel: Channel.EMAIL,
        to: 'a@test.com',
        body: 'A',
      });
      await service.createNotification({
        organization_id: orgId,
        channel: Channel.SMS,
        to: '+52155',
        body: 'B',
      });
      await service.createNotification({
        organization_id: 'org-456',
        channel: Channel.EMAIL,
        to: 'c@test.com',
        body: 'C',
      });
    });

    it('should return all notifications', async () => {
      const result = await service.findAll();
      expect(result).toHaveLength(3);
    });

    it('should filter by organization_id', async () => {
      const result = await service.findAll(orgId);
      expect(result).toHaveLength(2);
    });

    it('should sort by created_at desc', async () => {
      const result = await service.findAll(orgId);
      expect(result[0].created_at.getTime()).toBeGreaterThanOrEqual(
        result[1].created_at.getTime(),
      );
    });
  });

  describe('findById', () => {
    it('should return notification by id', async () => {
      const created = await service.createNotification({
        organization_id: orgId,
        channel: Channel.EMAIL,
        to: 'test@test.com',
        body: 'test',
      });

      const result = await service.findById(created.id);
      expect(result.id).toBe(created.id);
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('sendNotification', () => {
    it('should send pending notification', async () => {
      const notif = await service.createNotification({
        organization_id: orgId,
        channel: Channel.EMAIL,
        to: 'test@test.com',
        body: 'test',
      });

      const sent = await service.sendNotification(notif.id);
      expect(sent.status).toBe(NotificationStatus.DELIVERED);
      expect(sent.sent_at).toBeDefined();
      expect(sent.delivered_at).toBeDefined();
      expect(sent.attempts).toBe(1);
    });

    it('should throw BadRequestException if already sent', async () => {
      const notif = await service.createNotification({
        organization_id: orgId,
        channel: Channel.EMAIL,
        to: 'test@test.com',
        body: 'test',
      });

      await service.sendNotification(notif.id);

      await expect(service.sendNotification(notif.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('retryNotification', () => {
    it('should retry notification', async () => {
      const notif = await service.createNotification({
        organization_id: orgId,
        channel: Channel.SMS,
        to: '+52155',
        body: 'test',
      });

      const retried = await service.retryNotification(notif.id);
      expect(retried.attempts).toBe(1);
      expect(retried.status).toBe(NotificationStatus.DELIVERED);
    });

    it('should mark as failed after 3 attempts', async () => {
      const notif = await service.createNotification({
        organization_id: orgId,
        channel: Channel.SMS,
        to: '+52155',
        body: 'test',
      });

      // Force 3 attempts
      const n = (service as any).notifications.get(notif.id);
      n.attempts = 3;
      (service as any).notifications.set(notif.id, n);

      const result = await service.retryNotification(notif.id);
      expect(result.status).toBe(NotificationStatus.FAILED);
      expect(result.last_error).toContain('Max retries');
    });
  });

  describe('markDelivered', () => {
    it('should mark notification as delivered', async () => {
      const notif = await service.createNotification({
        organization_id: orgId,
        channel: Channel.PUSH,
        to: 'user-123',
        body: 'test',
      });

      const result = await service.markDelivered(notif.id);
      expect(result.status).toBe(NotificationStatus.DELIVERED);
      expect(result.delivered_at).toBeInstanceOf(Date);
    });
  });

  describe('markRead', () => {
    it('should mark notification as read', async () => {
      const notif = await service.createNotification({
        organization_id: orgId,
        channel: Channel.IN_APP,
        to: 'user-123',
        body: 'test',
      });

      const result = await service.markRead(notif.id);
      expect(result.status).toBe(NotificationStatus.READ);
      expect(result.read_at).toBeInstanceOf(Date);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      const notif = await service.createNotification({
        organization_id: orgId,
        channel: Channel.EMAIL,
        to: 'test@test.com',
        body: 'test',
      });

      await service.deleteNotification(notif.id);

      await expect(service.findById(notif.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if not found', async () => {
      await expect(service.deleteNotification('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.createNotification({
        organization_id: orgId,
        channel: Channel.EMAIL,
        to: 'a@test.com',
        body: 'A',
      });
      await service.createNotification({
        organization_id: orgId,
        channel: Channel.EMAIL,
        to: 'b@test.com',
        body: 'B',
      });
      await service.createNotification({
        organization_id: orgId,
        channel: Channel.SMS,
        to: '+52155',
        body: 'C',
      });
      await service.createNotification({
        organization_id: 'org-456',
        channel: Channel.EMAIL,
        to: 'c@test.com',
        body: 'D',
      });
    });

    it('should return comprehensive stats', async () => {
      const stats = await service.getStats(orgId);
      expect(stats.total).toBe(3);
      expect(stats.by_channel[Channel.EMAIL]).toBe(2);
      expect(stats.by_channel[Channel.SMS]).toBe(1);
      expect(stats.by_status[NotificationStatus.PENDING]).toBe(3);
    });
  });
});
