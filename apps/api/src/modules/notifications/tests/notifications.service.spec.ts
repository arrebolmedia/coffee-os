import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import { CreateTemplateDto, CreateNotificationDto } from '../dto';
import { Channel, NotificationStatus } from '../interfaces';

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

  it('should create and retrieve a template', async () => {
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
    expect(tpl.code).toBe('WELCOME_1');

    const list = await service.findTemplates(orgId);
    expect(list).toHaveLength(1);
  });

  it('should create notification from template and send', async () => {
    const tpl = await service.createTemplate({
      organization_id: orgId,
      code: 'WELCOME_2',
      name: 'Welcome Email 2',
      channel: Channel.EMAIL,
      subject: 'Hola',
      body: 'Hola {{user_name}}',
      variables: ['user_name'],
    });

    const dto: CreateNotificationDto = {
      organization_id: orgId,
      channel: Channel.EMAIL,
      to: 'user@example.com',
      template_id: tpl.id,
      data: { user_name: 'Carlos' },
    };

    const notif = await service.createNotification(dto);
    expect(notif).toBeDefined();
    expect(notif.status === NotificationStatus.PENDING || notif.status === NotificationStatus.SCHEDULED).toBeTruthy();
    expect(notif.body).toContain('Carlos');

    const sent = await service.sendNotification(notif.id);
    expect(sent.status).toBe(NotificationStatus.DELIVERED);
    expect(sent.delivered_at).toBeDefined();
  });

  it('should return stats', async () => {
    await service.createNotification({
      organization_id: orgId,
      channel: Channel.SMS,
      to: '+5215555555555',
      body: 'Hola',
    });

    const stats = await service.getStats(orgId);
    expect(stats.total).toBeGreaterThanOrEqual(1);
    expect(stats.by_channel[Channel.SMS]).toBeGreaterThanOrEqual(1);
  });
});
