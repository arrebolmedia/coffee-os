import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import {
  Channel,
  NotificationPriority,
  NotificationStatus,
  TemplateCategory,
} from '../interfaces/notification.interface';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { CreatePreferenceDto } from '../dto/create-preference.dto';
import { CreateBatchDto } from '../dto/create-batch.dto';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    // Clear all storage
    service['templates'].clear();
    service['notifications'].clear();
    service['preferences'].clear();
    service['batches'].clear();
    service['logs'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Templates', () => {
    describe('createTemplate', () => {
      it('should create a new template', async () => {
        const dto: CreateTemplateDto = {
          organization_id: mockOrgId,
          code: 'welcome_email',
          name: 'Welcome Email',
          description: 'Sent to new users',
          category: TemplateCategory.TRANSACTIONAL,
          channel: Channel.EMAIL,
          subject: 'Welcome to {{app_name}}!',
          body: 'Hello {{name}}, welcome!',
          html_body: '<h1>Hello {{name}}</h1>',
          variables: ['app_name', 'name'],
          created_by: mockUserId,
        };

        const result = await service.createTemplate(dto);

        expect(result).toBeDefined();
        expect(result.id).toContain('tpl-');
        expect(result.code).toBe('welcome_email');
        expect(result.is_active).toBe(true);
      });

      it('should throw ConflictException if code exists', async () => {
        const dto: CreateTemplateDto = {
          organization_id: mockOrgId,
          code: 'welcome_email',
          name: 'Welcome Email',
          category: TemplateCategory.TRANSACTIONAL,
          channel: Channel.EMAIL,
          body: 'Hello!',
          created_by: mockUserId,
        };

        await service.createTemplate(dto);

        await expect(service.createTemplate(dto)).rejects.toThrow(
          ConflictException,
        );
      });
    });

    describe('findAllTemplates', () => {
      beforeEach(async () => {
        await service.createTemplate({
          organization_id: mockOrgId,
          code: 'email1',
          name: 'Email 1',
          category: TemplateCategory.TRANSACTIONAL,
          channel: Channel.EMAIL,
          body: 'Test',
          created_by: mockUserId,
        });

        await service.createTemplate({
          organization_id: mockOrgId,
          code: 'sms1',
          name: 'SMS 1',
          category: TemplateCategory.MARKETING,
          channel: Channel.SMS,
          body: 'Test',
          created_by: mockUserId,
        });
      });

      it('should return all templates', async () => {
        const result = await service.findAllTemplates();
        expect(result.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter by organization_id', async () => {
        const result = await service.findAllTemplates(mockOrgId);
        expect(result.every((t) => t.organization_id === mockOrgId)).toBe(true);
      });

      it('should filter by channel', async () => {
        const result = await service.findAllTemplates(undefined, Channel.EMAIL);
        expect(result.every((t) => t.channel === Channel.EMAIL)).toBe(true);
      });

      it('should filter by category', async () => {
        const result = await service.findAllTemplates(
          undefined,
          undefined,
          TemplateCategory.MARKETING,
        );
        expect(
          result.every((t) => t.category === TemplateCategory.MARKETING),
        ).toBe(true);
      });
    });

    describe('findTemplateById', () => {
      it('should return template by id', async () => {
        const created = await service.createTemplate({
          organization_id: mockOrgId,
          code: 'test',
          name: 'Test',
          category: TemplateCategory.TRANSACTIONAL,
          channel: Channel.EMAIL,
          body: 'Test',
          created_by: mockUserId,
        });

        const result = await service.findTemplateById(created.id);
        expect(result).toEqual(created);
      });

      it('should throw NotFoundException', async () => {
        await expect(service.findTemplateById('invalid')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('findTemplateByCode', () => {
      it('should return template by code', async () => {
        await service.createTemplate({
          organization_id: mockOrgId,
          code: 'test_code',
          name: 'Test',
          category: TemplateCategory.TRANSACTIONAL,
          channel: Channel.EMAIL,
          body: 'Test',
          created_by: mockUserId,
        });

        const result = await service.findTemplateByCode(mockOrgId, 'test_code');
        expect(result.code).toBe('test_code');
      });

      it('should throw NotFoundException for invalid code', async () => {
        await expect(
          service.findTemplateByCode(mockOrgId, 'invalid'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateTemplate', () => {
      it('should update template', async () => {
        const created = await service.createTemplate({
          organization_id: mockOrgId,
          code: 'test',
          name: 'Original',
          category: TemplateCategory.TRANSACTIONAL,
          channel: Channel.EMAIL,
          body: 'Test',
          created_by: mockUserId,
        });

        const result = await service.updateTemplate(created.id, {
          name: 'Updated',
        });

        expect(result.name).toBe('Updated');
      });
    });

    describe('deleteTemplate', () => {
      it('should delete template', async () => {
        const created = await service.createTemplate({
          organization_id: mockOrgId,
          code: 'test',
          name: 'Test',
          category: TemplateCategory.TRANSACTIONAL,
          channel: Channel.EMAIL,
          body: 'Test',
          created_by: mockUserId,
        });

        await service.deleteTemplate(created.id);

        await expect(service.findTemplateById(created.id)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Notifications', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await service.createTemplate({
        organization_id: mockOrgId,
        code: 'test_template',
        name: 'Test Template',
        category: TemplateCategory.TRANSACTIONAL,
        channel: Channel.EMAIL,
        subject: 'Hello {{name}}',
        body: 'Message for {{name}}',
        created_by: mockUserId,
      });
      templateId = template.id;
    });

    describe('createNotification', () => {
      it('should create notification with template', async () => {
        const dto: CreateNotificationDto = {
          organization_id: mockOrgId,
          user_id: mockUserId,
          template_id: templateId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          data: { name: 'John' },
        };

        const result = await service.createNotification(dto);

        expect(result).toBeDefined();
        expect(result.id).toContain('not-');
        expect(result.subject).toBe('Hello John');
        expect(result.body).toBe('Message for John');
        expect(result.status).toBe(NotificationStatus.PENDING);
      });

      it('should create notification without template', async () => {
        const dto: CreateNotificationDto = {
          organization_id: mockOrgId,
          channel: Channel.SMS,
          to: '+1234567890',
          subject: 'Test',
          body: 'Test message',
        };

        const result = await service.createNotification(dto);
        expect(result.subject).toBe('Test');
        expect(result.body).toBe('Test message');
      });

      it('should set scheduled status', async () => {
        const dto: CreateNotificationDto = {
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
          scheduled_at: new Date(),
        };

        const result = await service.createNotification(dto);
        expect(result.status).toBe(NotificationStatus.SCHEDULED);
      });

      it('should throw error for inactive template', async () => {
        await service.updateTemplate(templateId, { is_active: false });

        const dto: CreateNotificationDto = {
          organization_id: mockOrgId,
          template_id: templateId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          data: {},
        };

        await expect(service.createNotification(dto)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('findAllNotifications', () => {
      beforeEach(async () => {
        await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          priority: NotificationPriority.HIGH,
          to: 'test@example.com',
          body: 'Test',
        });

        await service.createNotification({
          organization_id: mockOrgId,
          user_id: mockUserId,
          channel: Channel.SMS,
          priority: NotificationPriority.NORMAL,
          to: '+1234567890',
          body: 'Test',
        });
      });

      it('should return all notifications', async () => {
        const result = await service.findAllNotifications();
        expect(result.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter by organization_id', async () => {
        const result = await service.findAllNotifications(mockOrgId);
        expect(result.every((n) => n.organization_id === mockOrgId)).toBe(true);
      });

      it('should filter by user_id', async () => {
        const result = await service.findAllNotifications(
          undefined,
          mockUserId,
        );
        expect(result.every((n) => n.user_id === mockUserId)).toBe(true);
      });

      it('should filter by channel', async () => {
        const result = await service.findAllNotifications(
          undefined,
          undefined,
          Channel.EMAIL,
        );
        expect(result.every((n) => n.channel === Channel.EMAIL)).toBe(true);
      });

      it('should filter by priority', async () => {
        const result = await service.findAllNotifications(
          undefined,
          undefined,
          undefined,
          undefined,
          NotificationPriority.HIGH,
        );
        expect(
          result.every((n) => n.priority === NotificationPriority.HIGH),
        ).toBe(true);
      });
    });

    describe('sendNotification', () => {
      it('should send notification', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
        });

        const result = await service.sendNotification(notification.id);

        expect(result.status).toBe(NotificationStatus.DELIVERED);
        expect(result.sent_at).toBeDefined();
        expect(result.delivered_at).toBeDefined();
        expect(result.attempts).toBe(1);
      });

      it('should throw error if already sent', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
        });

        await service.sendNotification(notification.id);

        await expect(service.sendNotification(notification.id)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('retryNotification', () => {
      it('should retry failed notification', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
        });

        // Manually set as failed
        notification.status = NotificationStatus.FAILED;
        notification.attempts = 1;
        service['notifications'].set(notification.id, notification);

        const result = await service.retryNotification(notification.id);
        expect(result.attempts).toBe(2);
      });

      it('should fail after max retries', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
          max_attempts: 3,
        });

        // Set attempts to max
        notification.attempts = 3;
        service['notifications'].set(notification.id, notification);

        await expect(
          service.retryNotification(notification.id),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('markDelivered', () => {
      it('should mark as delivered', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
        });

        const result = await service.markDelivered(notification.id);
        expect(result.status).toBe(NotificationStatus.DELIVERED);
        expect(result.delivered_at).toBeDefined();
      });
    });

    describe('markRead', () => {
      it('should mark as read', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
        });

        const result = await service.markRead(notification.id);
        expect(result.status).toBe(NotificationStatus.READ);
        expect(result.read_at).toBeDefined();
      });
    });

    describe('markBounced', () => {
      it('should mark as bounced', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
        });

        const result = await service.markBounced(
          notification.id,
          'Invalid email',
        );
        expect(result.status).toBe(NotificationStatus.BOUNCED);
        expect(result.bounced_at).toBeDefined();
        expect(result.last_error).toBe('Invalid email');
      });
    });

    describe('deleteNotification', () => {
      it('should delete notification', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
        });

        await service.deleteNotification(notification.id);

        await expect(
          service.findNotificationById(notification.id),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('getNotificationLogs', () => {
      it('should return logs', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
        });

        await service.sendNotification(notification.id);

        const logs = await service.getNotificationLogs(notification.id);
        expect(logs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Preferences', () => {
    describe('createPreference', () => {
      it('should create preference', async () => {
        const dto: CreatePreferenceDto = {
          user_id: mockUserId,
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          category: TemplateCategory.MARKETING,
          enabled: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
        };

        const result = await service.createPreference(dto);

        expect(result).toBeDefined();
        expect(result.id).toContain('pref-');
        expect(result.enabled).toBe(false);
      });

      it('should throw ConflictException if exists', async () => {
        const dto: CreatePreferenceDto = {
          user_id: mockUserId,
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          category: TemplateCategory.MARKETING,
          enabled: true,
        };

        await service.createPreference(dto);

        await expect(service.createPreference(dto)).rejects.toThrow(
          ConflictException,
        );
      });
    });

    describe('findUserPreferences', () => {
      beforeEach(async () => {
        await service.createPreference({
          user_id: mockUserId,
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          category: TemplateCategory.MARKETING,
          enabled: false,
        });
      });

      it('should return user preferences', async () => {
        const result = await service.findUserPreferences(mockUserId);
        expect(result.length).toBeGreaterThan(0);
        expect(result.every((p) => p.user_id === mockUserId)).toBe(true);
      });
    });

    describe('updatePreference', () => {
      it('should update preference', async () => {
        const pref = await service.createPreference({
          user_id: mockUserId,
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          category: TemplateCategory.MARKETING,
          enabled: false,
        });

        const result = await service.updatePreference(pref.id, {
          enabled: true,
        });

        expect(result.enabled).toBe(true);
      });
    });

    describe('deletePreference', () => {
      it('should delete preference', async () => {
        const pref = await service.createPreference({
          user_id: mockUserId,
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          category: TemplateCategory.MARKETING,
          enabled: false,
        });

        await service.deletePreference(pref.id);

        await expect(service.updatePreference(pref.id, {})).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Batches', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await service.createTemplate({
        organization_id: mockOrgId,
        code: 'batch_template',
        name: 'Batch Template',
        category: TemplateCategory.MARKETING,
        channel: Channel.EMAIL,
        subject: 'Hello {{name}}',
        body: 'Message for {{name}}',
        created_by: mockUserId,
      });
      templateId = template.id;
    });

    describe('createBatch', () => {
      it('should create batch', async () => {
        const dto: CreateBatchDto = {
          organization_id: mockOrgId,
          name: 'Test Batch',
          description: 'Test batch sending',
          template_id: templateId,
          channel: Channel.EMAIL,
          recipients: ['user1@example.com', 'user2@example.com'],
          data: { company: 'CoffeeOS' },
          created_by: mockUserId,
        };

        const result = await service.createBatch(dto);

        expect(result).toBeDefined();
        expect(result.id).toContain('batch-');
        expect(result.total_count).toBe(2);
        expect(result.status).toBe('pending');
      });

      it('should throw error for inactive template', async () => {
        await service.updateTemplate(templateId, { is_active: false });

        const dto: CreateBatchDto = {
          organization_id: mockOrgId,
          name: 'Test Batch',
          template_id: templateId,
          channel: Channel.EMAIL,
          recipients: ['test@example.com'],
          created_by: mockUserId,
        };

        await expect(service.createBatch(dto)).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('processBatch', () => {
      it('should process batch and create notifications', async () => {
        const batch = await service.createBatch({
          organization_id: mockOrgId,
          name: 'Test Batch',
          template_id: templateId,
          channel: Channel.EMAIL,
          recipients: ['user1@example.com', 'user2@example.com'],
          data: { company: 'CoffeeOS' },
          created_by: mockUserId,
        });

        const result = await service.processBatch(batch.id);

        expect(result.status).toBe('completed');
        expect(result.sent_count).toBe(2);

        const notifications = await service.findAllNotifications(mockOrgId);
        expect(notifications.length).toBeGreaterThanOrEqual(2);
      });

      it('should throw error if already processed', async () => {
        const batch = await service.createBatch({
          organization_id: mockOrgId,
          name: 'Test Batch',
          template_id: templateId,
          channel: Channel.EMAIL,
          recipients: ['test@example.com'],
          created_by: mockUserId,
        });

        await service.processBatch(batch.id);

        await expect(service.processBatch(batch.id)).rejects.toThrow(
          BadRequestException,
        );
      });
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      // Create some notifications
      await service.createNotification({
        organization_id: mockOrgId,
        channel: Channel.EMAIL,
        to: 'test1@example.com',
        body: 'Test',
        priority: NotificationPriority.HIGH,
      });

      const notif2 = await service.createNotification({
        organization_id: mockOrgId,
        channel: Channel.SMS,
        to: '+1234567890',
        body: 'Test',
        priority: NotificationPriority.NORMAL,
      });

      await service.sendNotification(notif2.id);
    });

    describe('getStats', () => {
      it('should return comprehensive statistics', async () => {
        const result = await service.getStats(mockOrgId);

        expect(result.organization_id).toBe(mockOrgId);
        expect(result.total).toBeGreaterThanOrEqual(2);
        expect(result.by_status).toBeDefined();
        expect(result.by_channel).toBeDefined();
        expect(result.by_priority).toBeDefined();
        expect(result.success_rate).toBeDefined();
      });

      it('should calculate success rate', async () => {
        const result = await service.getStats(mockOrgId);
        expect(result.success_rate).toBeGreaterThan(0);
      });

      it('should include today counts', async () => {
        const result = await service.getStats(mockOrgId);
        expect(result.sent_today).toBeDefined();
        expect(result.delivered_today).toBeDefined();
      });
    });
  });
});
