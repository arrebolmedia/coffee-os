import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../database/prisma.service';
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

/**
 * In-memory mock of a Prisma model delegate. Stores camelCase rows (as the real
 * Prisma client returns them) so the service's toApi* mappers run unchanged.
 *
 * `uniqueKeys` lets a delegate enforce a composite @@unique by throwing a
 * P2002 PrismaClientKnownRequestError on create — used for preferences so the
 * service's catch(P2002) -> ConflictException path is exercised.
 */
function createDelegateMock(prefix: string, uniqueKeys?: string[]) {
  const store = new Map<string, Record<string, any>>();
  let seq = 0;

  const matchesWhere = (
    row: Record<string, any>,
    where: Record<string, any> = {},
  ): boolean => {
    return Object.entries(where).every(([key, cond]) => {
      if (
        cond &&
        typeof cond === 'object' &&
        !(cond instanceof Date) &&
        ('gte' in cond || 'lte' in cond)
      ) {
        const value = row[key] as Date;
        if (cond.gte !== undefined && value < cond.gte) return false;
        if (cond.lte !== undefined && value > cond.lte) return false;
        return true;
      }
      return row[key] === cond;
    });
  };

  const sortRows = (
    rows: Record<string, any>[],
    orderBy?: Record<string, 'asc' | 'desc'>,
  ) => {
    if (!orderBy) return rows;
    const [field, dir] = Object.entries(orderBy)[0];
    return [...rows].sort((a, b) => {
      const av = (a[field] as Date).getTime();
      const bv = (b[field] as Date).getTime();
      return dir === 'desc' ? bv - av : av - bv;
    });
  };

  return {
    __store: store,
    create: jest.fn(async ({ data }: { data: Record<string, any> }) => {
      if (uniqueKeys) {
        const dup = Array.from(store.values()).find((r) =>
          uniqueKeys.every((k) => r[k] === data[k]),
        );
        if (dup) {
          throw new Prisma.PrismaClientKnownRequestError(
            'Unique constraint failed',
            { code: 'P2002', clientVersion: 'test' } as any,
          );
        }
      }
      // cuid-like id (not the old `tpl-`/`not-`/`pref-`/`batch-` prefixes).
      const id = `c${prefix}${(seq++).toString(36).padStart(8, '0')}${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      const now = new Date();
      const row: Record<string, any> = {
        id,
        createdAt: now,
        updatedAt: now,
        timestamp: now,
        ...data,
      };
      store.set(id, row);
      return { ...row };
    }),
    findMany: jest.fn(
      async ({
        where = {},
        orderBy,
      }: {
        where?: Record<string, any>;
        orderBy?: Record<string, 'asc' | 'desc'>;
      } = {}) => {
        const rows = Array.from(store.values()).filter((r) =>
          matchesWhere(r, where),
        );
        return sortRows(rows, orderBy).map((r) => ({ ...r }));
      },
    ),
    findFirst: jest.fn(
      async ({ where = {} }: { where?: Record<string, any> } = {}) => {
        const row = Array.from(store.values()).find((r) =>
          matchesWhere(r, where),
        );
        return row ? { ...row } : null;
      },
    ),
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
      const row = store.get(where.id);
      return row ? { ...row } : null;
    }),
    update: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, any>;
      }) => {
        const row = store.get(where.id);
        if (!row) {
          throw new Error(`Record ${where.id} not found`);
        }
        const updated = { ...row, ...data, updatedAt: new Date() };
        store.set(where.id, updated);
        return { ...updated };
      },
    ),
    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      const row = store.get(where.id);
      store.delete(where.id);
      return row ? { ...row } : null;
    }),
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notificationTemplate: ReturnType<typeof createDelegateMock>;
    notification: ReturnType<typeof createDelegateMock>;
    notificationPreference: ReturnType<typeof createDelegateMock>;
    notificationBatch: ReturnType<typeof createDelegateMock>;
    notificationLog: ReturnType<typeof createDelegateMock>;
  };

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '123e4567-e89b-12d3-a456-426614174001';

  beforeEach(async () => {
    prisma = {
      notificationTemplate: createDelegateMock('tpl'),
      notification: createDelegateMock('not'),
      notificationPreference: createDelegateMock('pref', [
        'userId',
        'organizationId',
        'channel',
        'category',
      ]),
      notificationBatch: createDelegateMock('batch'),
      notificationLog: createDelegateMock('log'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
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
        expect(result.id).toBeDefined();
        expect(result.code).toBe('welcome_email');
        expect(result.is_active).toBe(true);
        expect(result.created_at).toBeInstanceOf(Date);
      });

      it('should throw ConflictException if active code exists', async () => {
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

      it('should allow re-creating a code after the prior one is deactivated', async () => {
        const dto: CreateTemplateDto = {
          organization_id: mockOrgId,
          code: 'reusable',
          name: 'Reusable',
          category: TemplateCategory.TRANSACTIONAL,
          channel: Channel.EMAIL,
          body: 'Hello!',
          created_by: mockUserId,
        };

        const first = await service.createTemplate(dto);
        await service.updateTemplate(first.id, { is_active: false });

        // The active pre-check should now pass since the prior is inactive.
        const second = await service.createTemplate(dto);
        expect(second.id).not.toBe(first.id);
        expect(second.is_active).toBe(true);
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

      it('should throw NotFoundException updating missing template', async () => {
        await expect(
          service.updateTemplate('invalid', { name: 'X' }),
        ).rejects.toThrow(NotFoundException);
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

      it('should throw NotFoundException deleting missing template', async () => {
        await expect(service.deleteTemplate('invalid')).rejects.toThrow(
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
      it('should create notification with template (interpolation)', async () => {
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
        expect(result.id).toBeDefined();
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

      it('should gate notification when user preference is disabled', async () => {
        await service.createPreference({
          user_id: mockUserId,
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          category: TemplateCategory.TRANSACTIONAL,
          enabled: false,
        });

        const result = await service.createNotification({
          organization_id: mockOrgId,
          user_id: mockUserId,
          template_id: templateId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          data: { name: 'John' },
        });

        expect(result.status).toBe(NotificationStatus.FAILED);
        expect(result.last_error).toBe(
          'User has disabled this notification channel/category',
        );
      });

      it('should write a creation log', async () => {
        const result = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
        });

        const logs = await service.getNotificationLogs(result.id);
        expect(logs.length).toBe(1);
        expect(logs[0].message).toBe('Notification created');
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

    describe('sendNotification (C3 fix: SENT, not DELIVERED)', () => {
      it('should mark notification as SENT (not DELIVERED) after sending', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
        });

        const result = await service.sendNotification(notification.id);

        // C3/H8: a successful provider hand-off is SENT, never auto-DELIVERED.
        expect(result.status).toBe(NotificationStatus.SENT);
        expect(result.sent_at).toBeDefined();
        expect(result.delivered_at).toBeUndefined();
        expect(result.provider_id).toBeDefined();
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

      it('should log "Notification sent" (not delivered)', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
        });

        await service.sendNotification(notification.id);

        const logs = await service.getNotificationLogs(notification.id);
        const messages = logs.map((l) => l.message);
        expect(messages).toContain('Notification sent');
        expect(messages).not.toContain('Notification delivered successfully');
      });
    });

    describe('retryNotification', () => {
      it('should retry a failed notification (increments attempts)', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
        });

        // Manually set as failed with one prior attempt.
        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.FAILED, attempts: 1 },
        });

        const result = await service.retryNotification(notification.id);
        expect(result.attempts).toBe(2);
        expect(result.status).toBe(NotificationStatus.SENT);
      });

      it('should fail after max retries', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
          max_attempts: 3,
        });

        await prisma.notification.update({
          where: { id: notification.id },
          data: { attempts: 3 },
        });

        await expect(
          service.retryNotification(notification.id),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('markDelivered (the ONLY path to DELIVERED)', () => {
      it('should flip status to DELIVERED and set delivered_at', async () => {
        const notification = await service.createNotification({
          organization_id: mockOrgId,
          channel: Channel.EMAIL,
          to: 'test@example.com',
          body: 'Test',
        });

        // Send first -> SENT, still not delivered.
        const sent = await service.sendNotification(notification.id);
        expect(sent.status).toBe(NotificationStatus.SENT);
        expect(sent.delivered_at).toBeUndefined();

        // Only the provider callback path promotes to DELIVERED.
        const delivered = await service.markDelivered(notification.id);
        expect(delivered.status).toBe(NotificationStatus.DELIVERED);
        expect(delivered.delivered_at).toBeDefined();
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

      it('should throw NotFoundException for unknown notification', async () => {
        await expect(service.getNotificationLogs('invalid')).rejects.toThrow(
          NotFoundException,
        );
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
        expect(result.id).toBeDefined();
        expect(result.enabled).toBe(false);
        expect(result.timezone).toBe('America/Mexico_City');
      });

      it('should throw ConflictException if exists (pre-check)', async () => {
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

      it('should map a P2002 unique violation to ConflictException', async () => {
        const dto: CreatePreferenceDto = {
          user_id: mockUserId,
          organization_id: mockOrgId,
          channel: Channel.SMS,
          category: TemplateCategory.ALERTS,
          enabled: true,
        };

        // Seed a duplicate row directly so the pre-check findFirst misses it
        // (bypassing the service) but the create() P2002 path is hit.
        prisma.notificationPreference.findFirst.mockResolvedValueOnce(null);
        await service.createPreference(dto);
        prisma.notificationPreference.findFirst.mockResolvedValueOnce(null);

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
        expect(result.id).toBeDefined();
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

      // Send then deliver so success_rate (DELIVERED+READ) is > 0.
      await service.sendNotification(notif2.id);
      await service.markDelivered(notif2.id);
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

      it('should aggregate by_status / by_channel / by_priority', async () => {
        const result = await service.getStats(mockOrgId);

        expect(result.by_status[NotificationStatus.DELIVERED]).toBe(1);
        expect(result.by_status[NotificationStatus.PENDING]).toBe(1);
        expect(result.by_channel[Channel.EMAIL]).toBe(1);
        expect(result.by_channel[Channel.SMS]).toBe(1);
        expect(result.by_priority[NotificationPriority.HIGH]).toBe(1);
        expect(result.by_priority[NotificationPriority.NORMAL]).toBe(1);
      });

      it('should calculate success rate', async () => {
        const result = await service.getStats(mockOrgId);
        // 1 delivered of 2 total -> 50%.
        expect(result.success_rate).toBe(50);
      });

      it('should include today counts', async () => {
        const result = await service.getStats(mockOrgId);
        expect(result.sent_today).toBe(1);
        expect(result.delivered_today).toBe(1);
      });
    });
  });
});
