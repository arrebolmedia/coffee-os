import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Notification as PrismaNotification,
  NotificationBatch as PrismaNotificationBatch,
  NotificationLog as PrismaNotificationLog,
  NotificationPreference as PrismaNotificationPreference,
  NotificationTemplate as PrismaNotificationTemplate,
} from '@prisma/client';
import {
  Channel,
  Notification,
  NotificationAttachment,
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
import { rangoDelDia } from '../../common/time/day-range';
import { zonaDelNegocio } from '../../common/time/zona-negocio';
import { PrismaService } from '../database/prisma.service';

/**
 * Servicio de notificaciones.
 *
 * Persistido en Prisma (antes 5 Maps en memoria: templates/notifications/
 * preferences/batches/logs — todo se perdía al reiniciar). Los enums viven
 * como columnas String en la DB ('email'/'pending'/'normal'/'transactional'),
 * por eso los mappers castean de vuelta a los tipos enum.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ==================== MAPPERS ====================
   *
   * Convierten una fila Prisma (camelCase, null para opcionales, Json sin tipar)
   * a la forma de la interfaz pública (snake_case, undefined para opcionales).
   */
  private toApiTemplate(row: PrismaNotificationTemplate): NotificationTemplate {
    return {
      id: row.id,
      organization_id: row.organizationId,
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      category: row.category as TemplateCategory,
      channel: row.channel as Channel,
      subject: row.subject ?? undefined,
      body: row.body,
      html_body: row.htmlBody ?? undefined,
      variables: row.variables,
      metadata: (row.metadata as Record<string, any> | null) ?? undefined,
      is_active: row.isActive,
      created_by: row.createdBy,
      updated_by: row.updatedBy ?? undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private toApiNotification(row: PrismaNotification): Notification {
    return {
      id: row.id,
      organization_id: row.organizationId,
      user_id: row.userId ?? undefined,
      template_id: row.templateId ?? undefined,
      channel: row.channel as Channel,
      priority: row.priority as NotificationPriority,
      to: row.to,
      cc: row.cc,
      bcc: row.bcc,
      subject: row.subject ?? undefined,
      body: row.body ?? undefined,
      html_body: row.htmlBody ?? undefined,
      data: (row.data as Record<string, any> | null) ?? undefined,
      attachments:
        (row.attachments as unknown as NotificationAttachment[] | null) ??
        undefined,
      status: row.status as NotificationStatus,
      attempts: row.attempts,
      max_attempts: row.maxAttempts,
      scheduled_at: row.scheduledAt ?? undefined,
      sent_at: row.sentAt ?? undefined,
      delivered_at: row.deliveredAt ?? undefined,
      read_at: row.readAt ?? undefined,
      bounced_at: row.bouncedAt ?? undefined,
      last_error: row.lastError ?? undefined,
      provider_id: row.providerId ?? undefined,
      provider_response: (row.providerResponse as any) ?? undefined,
      metadata: (row.metadata as Record<string, any> | null) ?? undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private toApiPreference(
    row: PrismaNotificationPreference,
  ): NotificationPreference {
    return {
      id: row.id,
      user_id: row.userId,
      organization_id: row.organizationId,
      channel: row.channel as Channel,
      category: row.category as TemplateCategory,
      enabled: row.enabled,
      quiet_hours_start: row.quietHoursStart ?? undefined,
      quiet_hours_end: row.quietHoursEnd ?? undefined,
      timezone: row.timezone ?? undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private toApiBatch(row: PrismaNotificationBatch): NotificationBatch {
    return {
      id: row.id,
      organization_id: row.organizationId,
      name: row.name,
      description: row.description ?? undefined,
      template_id: row.templateId,
      channel: row.channel as Channel,
      recipients: row.recipients,
      data: (row.data as Record<string, any> | null) ?? undefined,
      individual_data:
        (row.individualData as Record<string, Record<string, any>> | null) ??
        undefined,
      scheduled_at: row.scheduledAt ?? undefined,
      status: row.status as NotificationBatch['status'],
      total_count: row.totalCount,
      sent_count: row.sentCount,
      failed_count: row.failedCount,
      created_by: row.createdBy,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private toApiLog(row: PrismaNotificationLog): NotificationLog {
    return {
      id: row.id,
      notification_id: row.notificationId,
      timestamp: row.timestamp,
      status: row.status as NotificationStatus,
      message: row.message,
      details: (row.details as any) ?? undefined,
    };
  }

  // ==================== TEMPLATES ====================

  async createTemplate(dto: CreateTemplateDto): Promise<NotificationTemplate> {
    // Unique code per organization. No hay @@unique en la DB para templates
    // (a propósito: permite recrear un código tras desactivar el anterior),
    // por eso el pre-check es sobre un template ACTIVO con [organizationId, code].
    const existing = await this.prisma.notificationTemplate.findFirst({
      where: {
        organizationId: dto.organization_id,
        code: dto.code,
        isActive: true,
      },
    });
    if (existing)
      throw new ConflictException(
        'Template code already exists for this organization',
      );

    const row = await this.prisma.notificationTemplate.create({
      data: {
        organizationId: dto.organization_id,
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category,
        channel: dto.channel,
        subject: dto.subject ?? null,
        body: dto.body,
        htmlBody: dto.html_body ?? null,
        variables: dto.variables ?? [],
        metadata: dto.metadata ?? Prisma.JsonNull,
        isActive: dto.is_active !== undefined ? dto.is_active : true,
        createdBy: dto.created_by,
      },
    });

    return this.toApiTemplate(row);
  }

  async findAllTemplates(
    organization_id?: string,
    channel?: Channel,
    category?: TemplateCategory,
    is_active?: boolean,
  ): Promise<NotificationTemplate[]> {
    const where: Prisma.NotificationTemplateWhereInput = {};

    if (organization_id) where.organizationId = organization_id;
    if (channel) where.channel = channel;
    if (category) where.category = category;
    if (is_active !== undefined) where.isActive = is_active;

    const rows = await this.prisma.notificationTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((row) => this.toApiTemplate(row));
  }

  async findTemplateById(id: string): Promise<NotificationTemplate> {
    const row = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Template not found');
    return this.toApiTemplate(row);
  }

  async findTemplateByCode(
    organization_id: string,
    code: string,
  ): Promise<NotificationTemplate> {
    const row = await this.prisma.notificationTemplate.findFirst({
      where: { organizationId: organization_id, code, isActive: true },
    });
    if (!row) throw new NotFoundException('Template not found');
    return this.toApiTemplate(row);
  }

  async updateTemplate(
    id: string,
    dto: UpdateTemplateDto,
  ): Promise<NotificationTemplate> {
    await this.findTemplateById(id); // Validate exists

    const data: Prisma.NotificationTemplateUpdateInput = {};

    if (dto.organization_id !== undefined)
      data.organizationId = dto.organization_id;
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.channel !== undefined) data.channel = dto.channel;
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.html_body !== undefined) data.htmlBody = dto.html_body;
    if (dto.variables !== undefined) data.variables = dto.variables;
    if (dto.metadata !== undefined)
      data.metadata = dto.metadata ?? Prisma.JsonNull;
    if (dto.is_active !== undefined) data.isActive = dto.is_active;
    if (dto.updated_by !== undefined) data.updatedBy = dto.updated_by;

    const row = await this.prisma.notificationTemplate.update({
      where: { id },
      data,
    });
    return this.toApiTemplate(row);
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.findTemplateById(id); // Validate exists -> NotFoundException
    await this.prisma.notificationTemplate.delete({ where: { id } });
  }

  // ==================== NOTIFICATIONS ====================

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    let tpl: NotificationTemplate | undefined;

    let subject = dto.subject;
    let body = dto.body;
    let html_body = dto.html_body;
    const data = dto.data ?? {};

    // If template provided, resolve subject/body via interpolation
    if (dto.template_id) {
      tpl = await this.findTemplateById(dto.template_id);
      if (!tpl.is_active)
        throw new BadRequestException('Template is not active');

      subject =
        subject ||
        (tpl.subject ? this.interpolate(tpl.subject, data) : undefined);
      body = body || this.interpolate(tpl.body, data);
      if (tpl.html_body) {
        html_body = html_body || this.interpolate(tpl.html_body, data);
      }
    }

    let status: NotificationStatus = dto.scheduled_at
      ? NotificationStatus.SCHEDULED
      : NotificationStatus.PENDING;
    let last_error: string | undefined;

    // Check user preferences
    if (dto.user_id) {
      const canSend = await this.checkUserPreferences(
        dto.user_id,
        dto.channel,
        tpl?.category,
      );
      if (!canSend) {
        status = NotificationStatus.FAILED;
        last_error = 'User has disabled this notification channel/category';
      }
    }

    const row = await this.prisma.notification.create({
      data: {
        organizationId: dto.organization_id,
        userId: dto.user_id ?? null,
        templateId: dto.template_id ?? null,
        channel: dto.channel,
        priority: dto.priority || NotificationPriority.NORMAL,
        to: dto.to,
        cc: dto.cc ?? [],
        bcc: dto.bcc ?? [],
        subject: subject ?? null,
        body: body ?? null,
        htmlBody: html_body ?? null,
        data: (data as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        attachments: dto.attachments
          ? (dto.attachments as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        status,
        attempts: 0,
        maxAttempts: dto.max_attempts || 3,
        scheduledAt: dto.scheduled_at ?? null,
        lastError: last_error ?? null,
        metadata: dto.metadata ?? Prisma.JsonNull,
      },
    });

    await this.addLog(row.id, status, 'Notification created');

    return this.toApiNotification(row);
  }

  async findAllNotifications(
    organization_id?: string,
    user_id?: string,
    channel?: Channel,
    status?: NotificationStatus,
    priority?: NotificationPriority,
  ): Promise<Notification[]> {
    const where: Prisma.NotificationWhereInput = {};

    if (organization_id) where.organizationId = organization_id;
    if (user_id) where.userId = user_id;
    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const rows = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toApiNotification(row));
  }

  async findNotificationById(id: string): Promise<Notification> {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Notification not found');
    return this.toApiNotification(row);
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

    // Mark as processing and increment attempts
    const attempts = n.attempts + 1;
    await this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.PROCESSING, attempts },
    });
    await this.addLog(
      id,
      NotificationStatus.PROCESSING,
      `Sending notification (attempt ${attempts})`,
    );

    // Simulate sending based on channel
    try {
      await this.sendViaProvider(n);

      // C3/H8 FIX: a successful provider hand-off only means the message was
      // SENT — NOT delivered. We no longer auto-set delivered_at/DELIVERED here.
      // DELIVERED is set ONLY by a real provider delivery callback via
      // markDelivered() (no real provider is wired in v1 — Twilio/Mailrelay are
      // out of v1, so the simulated providerId stands in for the message id).
      const row = await this.prisma.notification.update({
        where: { id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          providerId: `provider-${Date.now()}`,
        },
      });

      await this.addLog(id, NotificationStatus.SENT, 'Notification sent');
      return this.toApiNotification(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const row = await this.prisma.notification.update({
        where: { id },
        data: { status: NotificationStatus.FAILED, lastError: message },
      });
      await this.addLog(id, NotificationStatus.FAILED, `Failed: ${message}`);
      return this.toApiNotification(row);
    }
  }

  async retryNotification(id: string): Promise<Notification> {
    const n = await this.findNotificationById(id);

    if (n.attempts >= n.max_attempts) {
      await this.prisma.notification.update({
        where: { id },
        data: {
          status: NotificationStatus.FAILED,
          lastError: 'Max retries exceeded',
        },
      });
      await this.addLog(id, NotificationStatus.FAILED, 'Max retries exceeded');
      throw new BadRequestException('Max retries exceeded');
    }

    return this.sendNotification(id);
  }

  /**
   * Provider delivery callback path. This is the ONLY place a notification is
   * promoted to DELIVERED (real callback from Twilio/Mailrelay in production).
   */
  async markDelivered(id: string): Promise<Notification> {
    await this.findNotificationById(id); // Validate exists
    const row = await this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.DELIVERED, deliveredAt: new Date() },
    });
    await this.addLog(id, NotificationStatus.DELIVERED, 'Marked as delivered');
    return this.toApiNotification(row);
  }

  async markRead(id: string): Promise<Notification> {
    await this.findNotificationById(id); // Validate exists
    const row = await this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
    await this.addLog(id, NotificationStatus.READ, 'Marked as read');
    return this.toApiNotification(row);
  }

  async markBounced(id: string, reason?: string): Promise<Notification> {
    await this.findNotificationById(id); // Validate exists
    const row = await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.BOUNCED,
        bouncedAt: new Date(),
        lastError: reason || 'Bounced',
      },
    });
    await this.addLog(id, NotificationStatus.BOUNCED, `Bounced: ${reason}`);
    return this.toApiNotification(row);
  }

  async deleteNotification(id: string): Promise<void> {
    await this.findNotificationById(id); // Validate exists -> NotFoundException
    // NotificationLog rows cascade via the relation (onDelete: Cascade).
    await this.prisma.notification.delete({ where: { id } });
  }

  async getNotificationLogs(id: string): Promise<NotificationLog[]> {
    await this.findNotificationById(id); // Validate exists
    const rows = await this.prisma.notificationLog.findMany({
      where: { notificationId: id },
      orderBy: { timestamp: 'asc' },
    });
    return rows.map((row) => this.toApiLog(row));
  }

  // ==================== PREFERENCES ====================

  async createPreference(
    dto: CreatePreferenceDto,
  ): Promise<NotificationPreference> {
    // Check if preference already exists (pre-check). There IS a DB @@unique on
    // [userId, organizationId, channel, category], so we also catch P2002 below.
    const existing = await this.prisma.notificationPreference.findFirst({
      where: {
        userId: dto.user_id,
        organizationId: dto.organization_id,
        channel: dto.channel,
        category: dto.category,
      },
    });

    if (existing) {
      throw new ConflictException('Preference already exists');
    }

    try {
      const row = await this.prisma.notificationPreference.create({
        data: {
          userId: dto.user_id,
          organizationId: dto.organization_id,
          channel: dto.channel,
          category: dto.category,
          enabled: dto.enabled,
          quietHoursStart: dto.quiet_hours_start ?? null,
          quietHoursEnd: dto.quiet_hours_end ?? null,
          timezone: dto.timezone || 'America/Mexico_City',
        },
      });
      return this.toApiPreference(row);
    } catch (error) {
      // Unique constraint race -> same ConflictException as the pre-check.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Preference already exists');
      }
      throw error;
    }
  }

  async findUserPreferences(
    user_id: string,
    organization_id?: string,
  ): Promise<NotificationPreference[]> {
    const where: Prisma.NotificationPreferenceWhereInput = { userId: user_id };

    if (organization_id) {
      where.organizationId = organization_id;
    }

    const rows = await this.prisma.notificationPreference.findMany({ where });
    return rows.map((row) => this.toApiPreference(row));
  }

  async updatePreference(
    id: string,
    updates: Partial<NotificationPreference>,
  ): Promise<NotificationPreference> {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Preference not found');

    const data: Prisma.NotificationPreferenceUpdateInput = {};

    if (updates.user_id !== undefined) data.userId = updates.user_id;
    if (updates.organization_id !== undefined)
      data.organizationId = updates.organization_id;
    if (updates.channel !== undefined) data.channel = updates.channel;
    if (updates.category !== undefined) data.category = updates.category;
    if (updates.enabled !== undefined) data.enabled = updates.enabled;
    if (updates.quiet_hours_start !== undefined)
      data.quietHoursStart = updates.quiet_hours_start;
    if (updates.quiet_hours_end !== undefined)
      data.quietHoursEnd = updates.quiet_hours_end;
    if (updates.timezone !== undefined) data.timezone = updates.timezone;

    const row = await this.prisma.notificationPreference.update({
      where: { id },
      data,
    });
    return this.toApiPreference(row);
  }

  async deletePreference(id: string): Promise<void> {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Preference not found');
    await this.prisma.notificationPreference.delete({ where: { id } });
  }

  // ==================== BATCHES ====================

  async createBatch(dto: CreateBatchDto): Promise<NotificationBatch> {
    const template = await this.findTemplateById(dto.template_id);
    if (!template.is_active) {
      throw new BadRequestException('Template is not active');
    }

    const row = await this.prisma.notificationBatch.create({
      data: {
        organizationId: dto.organization_id,
        name: dto.name,
        description: dto.description ?? null,
        templateId: dto.template_id,
        channel: dto.channel,
        recipients: dto.recipients,
        data: dto.data ?? Prisma.JsonNull,
        individualData: dto.individual_data ?? Prisma.JsonNull,
        scheduledAt: dto.scheduled_at ? new Date(dto.scheduled_at) : null,
        status: 'pending',
        totalCount: dto.recipients.length,
        sentCount: 0,
        failedCount: 0,
        createdBy: dto.created_by,
      },
    });

    return this.toApiBatch(row);
  }

  async findAllBatches(organization_id?: string): Promise<NotificationBatch[]> {
    const where: Prisma.NotificationBatchWhereInput = {};

    if (organization_id) {
      where.organizationId = organization_id;
    }

    const rows = await this.prisma.notificationBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toApiBatch(row));
  }

  async findBatchById(id: string): Promise<NotificationBatch> {
    const row = await this.prisma.notificationBatch.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Batch not found');
    return this.toApiBatch(row);
  }

  async processBatch(id: string): Promise<NotificationBatch> {
    const batch = await this.findBatchById(id);

    if (batch.status !== 'pending') {
      throw new BadRequestException('Batch already processed');
    }

    await this.prisma.notificationBatch.update({
      where: { id },
      data: { status: 'processing' },
    });

    let sent_count = 0;
    let failed_count = 0;

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
        sent_count++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Batch ${id}: failed to create notification for recipient "${recipient}": ${message}`,
        );
        failed_count++;
      }
    }

    const row = await this.prisma.notificationBatch.update({
      where: { id },
      data: {
        status: 'completed',
        sentCount: sent_count,
        failedCount: failed_count,
      },
    });

    return this.toApiBatch(row);
  }

  // ==================== STATISTICS ====================

  async getStats(organization_id: string): Promise<NotificationStats> {
    const rows = await this.prisma.notification.findMany({
      where: { organizationId: organization_id },
    });
    const arr = rows.map((row) => this.toApiNotification(row));

    const total = arr.length;
    const by_status: Partial<Record<NotificationStatus, number>> = {};
    const by_channel: Partial<Record<Channel, number>> = {};
    const by_priority: Partial<Record<NotificationPriority, number>> = {};

    // «Hoy» en la zona de la organizacion: con la del proceso, en UTC, los
    // contadores del dia se reiniciaban a las 18:00 hora de la cafeteria.
    const zona = await zonaDelNegocio(this.prisma, {
      organizationId: organization_id,
    });
    const today = rangoDelDia(undefined, zona)!.gte;

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

  private async addLog(
    notification_id: string,
    status: NotificationStatus,
    message: string,
    details?: any,
  ): Promise<void> {
    await this.prisma.notificationLog.create({
      data: {
        notificationId: notification_id,
        status,
        message,
        details: details ?? Prisma.JsonNull,
      },
    });
  }
}
