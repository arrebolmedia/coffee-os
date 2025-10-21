import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Notification, NotificationTemplate, NotificationStatus, Channel, NotificationStats } from './interfaces';
import { CreateNotificationDto, CreateTemplateDto } from './dto';

@Injectable()
export class NotificationsService {
  private readonly templates = new Map<string, NotificationTemplate>();
  private readonly notifications = new Map<string, Notification>();

  // Simple create for templates
  async createTemplate(dto: CreateTemplateDto): Promise<NotificationTemplate> {
    // unique code per organization
    const existing = Array.from(this.templates.values()).find(
      (t) => t.organization_id === dto.organization_id && t.code === dto.code,
    );
    if (existing) throw new ConflictException('Template code already exists');

    const tpl: NotificationTemplate = {
      id: `tpl-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      organization_id: dto.organization_id,
      code: dto.code,
      name: dto.name,
      channel: dto.channel,
      subject: dto.subject,
      body: dto.body,
      variables: dto.variables || [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.templates.set(tpl.id, tpl);
    return tpl;
  }

  async findTemplates(organization_id?: string): Promise<NotificationTemplate[]> {
    let arr = Array.from(this.templates.values());
    if (organization_id) arr = arr.filter(t => t.organization_id === organization_id);
    return arr;
  }

  async findTemplateById(id: string): Promise<NotificationTemplate> {
    const t = this.templates.get(id);
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  // Create notification (does not send automatically)
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notif: Notification = {
      id: `not-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      organization_id: dto.organization_id,
      template_id: dto.template_id,
      channel: dto.channel,
      to: dto.to,
      subject: dto.subject,
      body: dto.body,
      data: dto.data || {},
      status: dto.scheduled_at ? NotificationStatus.SCHEDULED : NotificationStatus.PENDING,
      attempts: 0,
      scheduled_at: dto.scheduled_at,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // If template provided, attach resolved subject/body (simple interpolation)
    if (dto.template_id) {
      const tpl = this.templates.get(dto.template_id);
      if (!tpl) throw new NotFoundException('Template not found');
      notif.subject = notif.subject || tpl.subject;
      notif.body = notif.body || this.interpolate(tpl.body, notif.data || {});
    }

    this.notifications.set(notif.id, notif);
    return notif;
  }

  async findAll(organization_id?: string): Promise<Notification[]> {
    let arr = Array.from(this.notifications.values());
    if (organization_id) arr = arr.filter(n => n.organization_id === organization_id);
    // sort by created_at desc
    arr.sort((a,b) => b.created_at.getTime() - a.created_at.getTime());
    return arr;
  }

  async findById(id: string): Promise<Notification> {
    const n = this.notifications.get(id);
    if (!n) throw new NotFoundException('Notification not found');
    return n;
  }

  // Simulate sending: mark sent, delivered
  async sendNotification(id: string): Promise<Notification> {
    const n = await this.findById(id);
    // do not send if already sent/delivered
    if (n.status === NotificationStatus.SENT || n.status === NotificationStatus.DELIVERED) {
      throw new BadRequestException('Notification already sent');
    }

    n.attempts += 1;
    n.status = NotificationStatus.SENT;
    n.sent_at = new Date();
    n.updated_at = new Date();

    // For testing, immediately mark delivered
    n.delivered_at = new Date();
    n.status = NotificationStatus.DELIVERED;

    this.notifications.set(n.id, n);
    return n;
  }

  // Retry logic: if attempts >=3 -> mark failed
  async retryNotification(id: string): Promise<Notification> {
    const n = await this.findById(id);
    if (n.attempts >= 3) {
      n.status = NotificationStatus.FAILED;
      n.last_error = 'Max retries exceeded';
      n.updated_at = new Date();
      this.notifications.set(n.id, n);
      return n;
    }

    return this.sendNotification(id);
  }

  async markDelivered(id: string): Promise<Notification> {
    const n = await this.findById(id);
    n.delivered_at = new Date();
    n.status = NotificationStatus.DELIVERED;
    n.updated_at = new Date();
    this.notifications.set(n.id, n);
    return n;
  }

  async markRead(id: string): Promise<Notification> {
    const n = await this.findById(id);
    n.read_at = new Date();
    n.status = NotificationStatus.READ;
    n.updated_at = new Date();
    this.notifications.set(n.id, n);
    return n;
  }

  async deleteNotification(id: string): Promise<void> {
    const n = this.notifications.get(id);
    if (!n) throw new NotFoundException('Notification not found');
    this.notifications.delete(id);
  }

  async getStats(organization_id: string): Promise<NotificationStats> {
    const arr = Array.from(this.notifications.values()).filter(n => n.organization_id === organization_id);
    const total = arr.length;
    const by_status: Partial<Record<NotificationStatus, number>> = {};
    const by_channel: Partial<Record<Channel, number>> = {};

    arr.forEach(n => {
      by_status[n.status] = (by_status[n.status] || 0) + 1;
      by_channel[n.channel] = (by_channel[n.channel] || 0) + 1;
    });

    return { total, by_status, by_channel };
  }

  // Very small interpolation for templates: {{key}}
  private interpolate(template: string, data: Record<string, any>) {
    return template.replace(/{{\s*([\w\.]+)\s*}}/g, (_, key) => {
      const val = data[key];
      return val !== undefined ? String(val) : '';
    });
  }
}
