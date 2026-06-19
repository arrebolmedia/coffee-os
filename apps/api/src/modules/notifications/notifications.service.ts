import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Channel,
  Notification,
  NotificationBatch,
  NotificationLog,
  NotificationPreference,
  NotificationPriority,
  NotificationStats,
  NotificationStatus,
  NotificationTemplate,
  TemplateCategory,
} from './interfaces';
import {
  CreateBatchDto,
  CreateNotificationDto,
  CreatePreferenceDto,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly templates = new Map<string, NotificationTemplate>();
  private readonly notifications = new Map<string, Notification>();
  private readonly preferences = new Map<string, NotificationPreference>();
  private readonly batches = new Map<string, NotificationBatch>();
  private readonly logs = new Map<string, NotificationLog[]>();

  // ==================== TEMPLATES ====================

  async createTemplate(dto: CreateTemplateDto): Promise<NotificationTemplate> {
    // Unique code per organization
    const existing = Array.from(this.templates.values()).find(
      (t) =>
        t.organization_id === dto.organization_id &&
        t.code === dto.code &&
        t.is_active,
    );
    if (existing)
      throw new ConflictException(
        'Template code already exists for this organization',
      );

    const tpl: NotificationTemplate = {
      id: `tpl-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      organization_id: dto.organization_id,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      channel: dto.channel,
      subject: dto.subject,
      body: dto.body,
      html_body: dto.html_body,
      variables: dto.variables || [],
      metadata: dto.metadata || {},
      is_active: dto.is_active !== undefined ? dto.is_active : true,
      created_by: dto.created_by,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.templates.set(tpl.id, tpl);
    return tpl;
  }

  async findAllTemplates(
    organization_id?: string,
    channel?: Channel,
    category?: TemplateCategory,
    is_active?: boolean,
  ): Promise<NotificationTemplate[]> {
    let arr = Array.from(this.templates.values());

    if (organization_id)
      arr = arr.filter((t) => t.organization_id === organization_id);
    if (channel) arr = arr.filter((t) => t.channel === channel);
    if (category) arr = arr.filter((t) => t.category === category);
    if (is_active !== undefined)
      arr = arr.filter((t) => t.is_active === is_active);

    // Sort by updated_at DESC
    arr.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
    return arr;
  }

  async findTemplateById(id: string): Promise<NotificationTemplate> {
    const t = this.templates.get(id);
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async findTemplateByCode(
    organization_id: string,
    code: string,
  ): Promise<NotificationTemplate> {
    const template = Array.from(this.templates.values()).find(
      (t) =>
        t.organization_id === organization_id && t.code === code && t.is_active,
    );
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(
    id: string,
    dto: UpdateTemplateDto,
  ): Promise<NotificationTemplate> {
    const template = await this.findTemplateById(id);

    Object.assign(template, {
      ...dto,
      updated_at: new Date(),
    });

    this.templates.set(id, template);
    return template;
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (!template) throw new NotFoundException('Template not found');
    this.templates.delete(id);
  }

  // ==================== NOTIFICATIONS ====================

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    let tpl: NotificationTemplate | undefined;

    const notif: Notification = {
      id: `not-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      organization_id: dto.organization_id,
      user_id: dto.user_id,
      template_id: dto.template_id,
      channel: dto.channel,
      priority: dto.priority || NotificationPriority.NORMAL,
      to: dto.to,
      cc: dto.cc,
      bcc: dto.bcc,
      subject: dto.subject,
      body: dto.body,
      html_body: dto.html_body,
      data: dto.data || {},
      attachments: dto.attachments,
      status: dto.scheduled_at
        ? NotificationStatus.SCHEDULED
        : NotificationStatus.PENDING,
      attempts: 0,
      max_attempts: dto.max_attempts || 3,
      scheduled_at: dto.scheduled_at,
      metadata: dto.metadata || {},
      created_at: new Date(),
      updated_at: new Date(),
    };

    // If template provided, resolve subject/body
    if (dto.template_id) {
      tpl = await this.findTemplateById(dto.template_id);
      if (!tpl.is_active)
        throw new BadRequestException('Template is not active');

      notif.subject =
        notif.subject ||
        (tpl.subject
          ? this.interpolate(tpl.subject, notif.data || {})
          : undefined);
      notif.body = notif.body || this.interpolate(tpl.body, notif.data || {});
      if (tpl.html_body) {
        notif.html_body =
          notif.html_body || this.interpolate(tpl.html_body, notif.data || {});
      }
    }

    // Check user preferences
    if (notif.user_id) {
      const canSend = await this.checkUserPreferences(
        notif.user_id,
        notif.channel,
        tpl?.category,
      );
      if (!canSend) {
        notif.status = NotificationStatus.FAILED;
        notif.last_error =
          'User has disabled this notification channel/category';
      }
    }

    this.notifications.set(notif.id, notif);
    this.addLog(notif.id, notif.status, 'Notification created');

    return notif;
  }

  async findAllNotifications(
    organization_id?: string,
    user_id?: string,
    channel?: Channel,
    status?: NotificationStatus,
    priority?: NotificationPriority,
  ): Promise<Notification[]> {
    let arr = Array.from(this.notifications.values());

    if (organization_id)
      arr = arr.filter((n) => n.organization_id === organization_id);
    if (user_id) arr = arr.filter((n) => n.user_id === user_id);
    if (channel) arr = arr.filter((n) => n.channel === channel);
    if (status) arr = arr.filter((n) => n.status === status);
    if (priority) arr = arr.filter((n) => n.priority === priority);

    // Sort by created_at DESC
    arr.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return arr;
  }

  async findNotificationById(id: string): Promise<Notification> {
    const n = this.notifications.get(id);
    if (!n) throw new NotFoundException('Notification not found');
    return n;
  }

  async sendNotification(id: string): Promise<Notification> {
    const n = await this.findNotificationById(id);

    // Validation
    if (
      n.status === NotificationStatus.SENT ||
      n.status === NotificationStatus.DELIVERED
    ) {
      throw new BadRequestException('Notification already sent');
    }

    if (n.attempts >= n.max_attempts) {
      throw new BadRequestException('Max attempts exceeded');
    }

    // Update status
    n.status = NotificationStatus.PROCESSING;
    n.attempts += 1;
    n.updated_at = new Date();
    this.addLog(n.id, n.status, `Sending notification (attempt ${n.attempts})`);

    // Simulate sending based on channel
    try {
      await this.sendViaProvider(n);

      n.status = NotificationStatus.SENT;
      n.sent_at = new Date();
      n.provider_id = `provider-${Date.now()}`;

      // For testing, immediately mark as delivered
      n.delivered_at = new Date();
      n.status = NotificationStatus.DELIVERED;

      this.addLog(n.id, n.status, 'Notification delivered successfully');
    } catch (error) {
      n.status = NotificationStatus.FAILED;
      n.last_error = error.message;
      this.addLog(n.id, n.status, `Failed: ${error.message}`);
    }

    this.notifications.set(n.id, n);
    return n;
  }

  async retryNotification(id: string): Promise<Notification> {
    const n = await this.findNotificationById(id);

    if (n.attempts >= n.max_attempts) {
      n.status = NotificationStatus.FAILED;
      n.last_error = 'Max retries exceeded';
      n.updated_at = new Date();
      this.notifications.set(n.id, n);
      this.addLog(n.id, n.status, 'Max retries exceeded');
      throw new BadRequestException('Max retries exceeded');
    }

    return this.sendNotification(id);
  }

  async markDelivered(id: string): Promise<Notification> {
    const n = await this.findNotificationById(id);
    n.delivered_at = new Date();
    n.status = NotificationStatus.DELIVERED;
    n.updated_at = new Date();
    this.notifications.set(n.id, n);
    this.addLog(n.id, n.status, 'Marked as delivered');
    return n;
  }

  async markRead(id: string): Promise<Notification> {
    const n = await this.findNotificationById(id);
    n.read_at = new Date();
    n.status = NotificationStatus.READ;
    n.updated_at = new Date();
    this.notifications.set(n.id, n);
    this.addLog(n.id, n.status, 'Marked as read');
    return n;
  }

  async markBounced(id: string, reason?: string): Promise<Notification> {
    const n = await this.findNotificationById(id);
    n.bounced_at = new Date();
    n.status = NotificationStatus.BOUNCED;
    n.last_error = reason || 'Bounced';
    n.updated_at = new Date();
    this.notifications.set(n.id, n);
    this.addLog(n.id, n.status, `Bounced: ${reason}`);
    return n;
  }

  async deleteNotification(id: string): Promise<void> {
    const n = this.notifications.get(id);
    if (!n) throw new NotFoundException('Notification not found');
    this.notifications.delete(id);
    this.logs.delete(id);
  }

  async getNotificationLogs(id: string): Promise<NotificationLog[]> {
    await this.findNotificationById(id); // Validate exists
    return this.logs.get(id) || [];
  }

  // ==================== PREFERENCES ====================

  async createPreference(
    dto: CreatePreferenceDto,
  ): Promise<NotificationPreference> {
    // Check if preference already exists
    const existing = Array.from(this.preferences.values()).find(
      (p) =>
        p.user_id === dto.user_id &&
        p.organization_id === dto.organization_id &&
        p.channel === dto.channel &&
        p.category === dto.category,
    );

    if (existing) {
      throw new ConflictException('Preference already exists');
    }

    const pref: NotificationPreference = {
      id: `pref-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      user_id: dto.user_id,
      organization_id: dto.organization_id,
      channel: dto.channel,
      category: dto.category,
      enabled: dto.enabled,
      quiet_hours_start: dto.quiet_hours_start,
      quiet_hours_end: dto.quiet_hours_end,
      timezone: dto.timezone || 'America/Mexico_City',
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.preferences.set(pref.id, pref);
    return pref;
  }

  async findUserPreferences(
    user_id: string,
    organization_id?: string,
  ): Promise<NotificationPreference[]> {
    let arr = Array.from(this.preferences.values()).filter(
      (p) => p.user_id === user_id,
    );

    if (organization_id) {
      arr = arr.filter((p) => p.organization_id === organization_id);
    }

    return arr;
  }

  async updatePreference(
    id: string,
    updates: Partial<NotificationPreference>,
  ): Promise<NotificationPreference> {
    const pref = this.preferences.get(id);
    if (!pref) throw new NotFoundException('Preference not found');

    Object.assign(pref, {
      ...updates,
      updated_at: new Date(),
    });

    this.preferences.set(id, pref);
    return pref;
  }

  async deletePreference(id: string): Promise<void> {
    const pref = this.preferences.get(id);
    if (!pref) throw new NotFoundException('Preference not found');
    this.preferences.delete(id);
  }

  // ==================== BATCHES ====================

  async createBatch(dto: CreateBatchDto): Promise<NotificationBatch> {
    const template = await this.findTemplateById(dto.template_id);
    if (!template.is_active) {
      throw new BadRequestException('Template is not active');
    }

    const batch: NotificationBatch = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      organization_id: dto.organization_id,
      name: dto.name,
      description: dto.description,
      template_id: dto.template_id,
      channel: dto.channel,
      recipients: dto.recipients,
      data: dto.data || {},
      individual_data: dto.individual_data || {},
      scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
      status: 'pending',
      total_count: dto.recipients.length,
      sent_count: 0,
      failed_count: 0,
      created_by: dto.created_by,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.batches.set(batch.id, batch);
    return batch;
  }

  async findAllBatches(organization_id?: string): Promise<NotificationBatch[]> {
    let arr = Array.from(this.batches.values());

    if (organization_id) {
      arr = arr.filter((b) => b.organization_id === organization_id);
    }

    arr.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return arr;
  }

  async findBatchById(id: string): Promise<NotificationBatch> {
    const batch = this.batches.get(id);
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async processBatch(id: string): Promise<NotificationBatch> {
    const batch = await this.findBatchById(id);

    if (batch.status !== 'pending') {
      throw new BadRequestException('Batch already processed');
    }

    batch.status = 'processing';
    batch.updated_at = new Date();
    this.batches.set(id, batch);

    // Create individual notifications
    for (const recipient of batch.recipients) {
      const individualData = batch.individual_data?.[recipient] || {};
      const combinedData = { ...batch.data, ...individualData };

      try {
        await this.createNotification({
          organization_id: batch.organization_id,
          template_id: batch.template_id,
          channel: batch.channel,
          to: recipient,
          data: combinedData,
          scheduled_at: batch.scheduled_at,
          priority: NotificationPriority.NORMAL,
        });
        batch.sent_count++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Batch ${id}: failed to create notification for recipient "${recipient}": ${message}`,
        );
        batch.failed_count++;
      }
    }

    batch.status = 'completed';
    batch.updated_at = new Date();
    this.batches.set(id, batch);

    return batch;
  }

  // ==================== STATISTICS ====================

  async getStats(organization_id: string): Promise<NotificationStats> {
    const arr = Array.from(this.notifications.values()).filter(
      (n) => n.organization_id === organization_id,
    );

    const total = arr.length;
    const by_status: Partial<Record<NotificationStatus, number>> = {};
    const by_channel: Partial<Record<Channel, number>> = {};
    const by_priority: Partial<Record<NotificationPriority, number>> = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let failed_today = 0;
    let sent_today = 0;
    let delivered_today = 0;
    let total_delivery_time = 0;
    let delivery_count = 0;

    arr.forEach((n) => {
      // Counts
      by_status[n.status] = (by_status[n.status] || 0) + 1;
      by_channel[n.channel] = (by_channel[n.channel] || 0) + 1;
      by_priority[n.priority] = (by_priority[n.priority] || 0) + 1;

      // Today counts
      if (n.created_at >= today) {
        if (n.status === NotificationStatus.FAILED) failed_today++;
        if (n.sent_at && n.sent_at >= today) sent_today++;
        if (n.delivered_at && n.delivered_at >= today) delivered_today++;
      }

      // Delivery time
      if (n.sent_at && n.delivered_at) {
        total_delivery_time += n.delivered_at.getTime() - n.sent_at.getTime();
        delivery_count++;
      }
    });

    const successful =
      (by_status[NotificationStatus.DELIVERED] || 0) +
      (by_status[NotificationStatus.READ] || 0);
    const success_rate = total > 0 ? (successful / total) * 100 : 0;

    const avg_delivery_time_ms =
      delivery_count > 0 ? total_delivery_time / delivery_count : undefined;

    return {
      organization_id,
      total,
      by_status,
      by_channel,
      by_priority,
      success_rate,
      avg_delivery_time_ms,
      failed_today,
      sent_today,
      delivered_today,
    };
  }

  // ==================== HELPERS ====================

  private async sendViaProvider(notification: Notification): Promise<void> {
    // Simulate provider integration
    // In production, integrate with Twilio, Mailrelay, Firebase, etc.

    switch (notification.channel) {
      case Channel.EMAIL:
        // await this.mailrelayService.send(notification);
        break;
      case Channel.SMS:
      case Channel.WHATSAPP:
        // await this.twilioService.send(notification);
        break;
      case Channel.PUSH:
        // await this.firebaseService.send(notification);
        break;
      case Channel.WEBHOOK:
        // await this.httpService.post(notification.to, notification.data);
        break;
      default:
        throw new Error(`Unsupported channel: ${notification.channel}`);
    }

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  private async checkUserPreferences(
    user_id: string,
    channel: Channel,
    category?: TemplateCategory,
  ): Promise<boolean> {
    const prefs = await this.findUserPreferences(user_id);

    // If no preferences set, allow by default
    if (prefs.length === 0) return true;

    // Check if there's a preference for this channel + category
    const pref = prefs.find(
      (p) => p.channel === channel && (!category || p.category === category),
    );

    if (pref && !pref.enabled) return false;

    // Check quiet hours
    if (pref && pref.quiet_hours_start && pref.quiet_hours_end) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (
        currentTime >= pref.quiet_hours_start &&
        currentTime <= pref.quiet_hours_end
      ) {
        return false;
      }
    }

    return true;
  }

  private interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
      const val = data[key];
      return val !== undefined ? String(val) : '';
    });
  }

  private addLog(
    notification_id: string,
    status: NotificationStatus,
    message: string,
    details?: any,
  ): void {
    const log: NotificationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      notification_id,
      timestamp: new Date(),
      status,
      message,
      details,
    };

    const logs = this.logs.get(notification_id) || [];
    logs.push(log);
    this.logs.set(notification_id, logs);
  }
}
