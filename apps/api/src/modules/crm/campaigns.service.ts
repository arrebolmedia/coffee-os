import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CampaignChannel,
  CampaignStatus,
  CampaignType,
  CreateCampaignDto,
  QueryCampaignsDto,
} from './dto';
import { Campaign, CampaignRecipient } from './interfaces';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapCampaign(c: any): Campaign {
    return {
      id: c.id,
      organization_id: c.organizationId,
      name: c.name,
      description: c.description ?? undefined,
      type: c.type as CampaignType,
      status: c.status as CampaignStatus,
      channels: c.channels as CampaignChannel[],
      segment_id: c.segmentId ?? undefined,
      start_date: c.startDate ?? undefined,
      end_date: c.endDate ?? undefined,
      is_automated: c.isAutomated,
      email_subject: c.emailSubject ?? undefined,
      email_body: c.emailBody ?? undefined,
      whatsapp_template_id: c.whatsappTemplateId ?? undefined,
      sms_message: c.smsMessage ?? undefined,
      push_title: c.pushTitle ?? undefined,
      push_body: c.pushBody ?? undefined,
      offer_code: c.offerCode ?? undefined,
      offer_description: c.offerDescription ?? undefined,
      offer_discount_percent: c.offerDiscountPercent ?? undefined,
      offer_discount_amount: c.offerDiscountAmount ?? undefined,
      total_recipients: c.totalRecipients,
      sent_count: c.sentCount,
      delivered_count: c.deliveredCount,
      opened_count: c.openedCount,
      clicked_count: c.clickedCount,
      converted_count: c.convertedCount,
      unsubscribed_count: c.unsubscribedCount,
      created_by_user_id: c.createdByUserId ?? undefined,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    };
  }

  private mapRecipient(r: any): CampaignRecipient {
    return {
      id: r.id,
      campaign_id: r.campaignId,
      customer_id: r.customerId,
      channel: r.channel as CampaignChannel,
      sent_at: r.sentAt ?? undefined,
      delivered_at: r.deliveredAt ?? undefined,
      opened_at: r.openedAt ?? undefined,
      clicked_at: r.clickedAt ?? undefined,
      converted_at: r.convertedAt ?? undefined,
      unsubscribed_at: r.unsubscribedAt ?? undefined,
      error_message: r.errorMessage ?? undefined,
    };
  }

  async create(
    createDto: CreateCampaignDto,
    createdByUserId?: string,
  ): Promise<Campaign> {
    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId: createDto.organization_id,
        name: createDto.name,
        description: createDto.description,
        type: createDto.type,
        status: 'DRAFT',
        channels: createDto.channels,
        segmentId: createDto.segment_id,
        startDate: createDto.start_date ? new Date(createDto.start_date) : null,
        endDate: createDto.end_date ? new Date(createDto.end_date) : null,
        isAutomated: createDto.is_automated,
        emailSubject: createDto.email_subject,
        emailBody: createDto.email_body,
        whatsappTemplateId: createDto.whatsapp_template_id,
        smsMessage: createDto.sms_message,
        pushTitle: createDto.push_title,
        pushBody: createDto.push_body,
        offerCode: createDto.offer_code,
        offerDescription: createDto.offer_description,
        offerDiscountPercent: createDto.offer_discount_percent,
        offerDiscountAmount: createDto.offer_discount_amount,
        createdByUserId,
      },
    });
    return this.mapCampaign(campaign);
  }

  async findAll(query: QueryCampaignsDto): Promise<Campaign[]> {
    // organization_id es obligatorio: sin él la consulta no llevaría filtro de
    // organización y devolvería las campañas de todos los tenants.
    if (!query.organization_id) {
      throw new BadRequestException('organization_id is required');
    }
    const where: any = { organizationId: query.organization_id };
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const campaigns = await this.prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map(this.mapCampaign.bind(this));
  }

  async findOne(id: string, organizationId: string): Promise<Campaign | null> {
    // El filtro por organizationId va en el propio findFirst, no en un chequeo
    // posterior: así una campaña ajena es indistinguible de una inexistente y
    // no se filtra su existencia.
    const c = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });
    return c ? this.mapCampaign(c) : null;
  }

  async updateStatus(
    id: string,
    status: CampaignStatus,
    organizationId: string,
  ): Promise<Campaign> {
    const existing = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException(`Campaign ${id} not found`);

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status },
    });
    return this.mapCampaign(updated);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    // deleteMany + filtro de organización: un id ajeno borra 0 filas en vez de
    // borrar el registro de otro tenant.
    const { count } = await this.prisma.campaign.deleteMany({
      where: { id, organizationId },
    });
    if (count === 0) throw new NotFoundException(`Campaign ${id} not found`);
  }

  async addRecipient(
    campaignId: string,
    customerId: string,
    channel: CampaignChannel,
  ): Promise<CampaignRecipient> {
    const [recipient] = await this.prisma.$transaction([
      this.prisma.campaignRecipient.create({
        data: { campaignId, customerId, channel },
      }),
      this.prisma.campaign.update({
        where: { id: campaignId },
        data: { totalRecipients: { increment: 1 } },
      }),
    ]);
    return this.mapRecipient(recipient);
  }

  async markSent(recipientId: string): Promise<void> {
    const r = await this.prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
    });
    if (!r) return;
    await this.prisma.$transaction([
      this.prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { sentAt: new Date() },
      }),
      this.prisma.campaign.update({
        where: { id: r.campaignId },
        data: { sentCount: { increment: 1 } },
      }),
    ]);
  }

  async markDelivered(recipientId: string): Promise<void> {
    const r = await this.prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
    });
    if (!r) return;
    await this.prisma.$transaction([
      this.prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { deliveredAt: new Date() },
      }),
      this.prisma.campaign.update({
        where: { id: r.campaignId },
        data: { deliveredCount: { increment: 1 } },
      }),
    ]);
  }

  async markOpened(recipientId: string): Promise<void> {
    const r = await this.prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
    });
    if (!r || r.openedAt) return; // no double-count
    await this.prisma.$transaction([
      this.prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { openedAt: new Date() },
      }),
      this.prisma.campaign.update({
        where: { id: r.campaignId },
        data: { openedCount: { increment: 1 } },
      }),
    ]);
  }

  async markClicked(recipientId: string): Promise<void> {
    const r = await this.prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
    });
    if (!r || r.clickedAt) return;
    await this.prisma.$transaction([
      this.prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { clickedAt: new Date() },
      }),
      this.prisma.campaign.update({
        where: { id: r.campaignId },
        data: { clickedCount: { increment: 1 } },
      }),
    ]);
  }

  async markConverted(recipientId: string): Promise<void> {
    const r = await this.prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
    });
    if (!r || r.convertedAt) return;
    await this.prisma.$transaction([
      this.prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { convertedAt: new Date() },
      }),
      this.prisma.campaign.update({
        where: { id: r.campaignId },
        data: { convertedCount: { increment: 1 } },
      }),
    ]);
  }

  async markUnsubscribed(recipientId: string): Promise<void> {
    const r = await this.prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
    });
    if (!r || r.unsubscribedAt) return;
    await this.prisma.$transaction([
      this.prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { unsubscribedAt: new Date() },
      }),
      this.prisma.campaign.update({
        where: { id: r.campaignId },
        data: { unsubscribedCount: { increment: 1 } },
      }),
    ]);
  }

  async getCampaignRecipients(
    campaignId: string,
  ): Promise<CampaignRecipient[]> {
    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId },
    });
    return recipients.map(this.mapRecipient.bind(this));
  }

  async getStats(organizationId: string): Promise<any> {
    const where = { organizationId };

    const [total, active, draft, completed, paused, byTypeRaw, metricsAgg] =
      await Promise.all([
        this.prisma.campaign.count({ where }),
        this.prisma.campaign.count({ where: { ...where, status: 'ACTIVE' } }),
        this.prisma.campaign.count({ where: { ...where, status: 'DRAFT' } }),
        this.prisma.campaign.count({
          where: { ...where, status: 'COMPLETED' },
        }),
        this.prisma.campaign.count({ where: { ...where, status: 'PAUSED' } }),
        this.prisma.campaign.groupBy({
          by: ['type'],
          where,
          _count: { type: true },
        }),
        this.prisma.campaign.aggregate({
          where,
          _sum: {
            sentCount: true,
            deliveredCount: true,
            openedCount: true,
            clickedCount: true,
            convertedCount: true,
          },
        }),
      ]);

    const byType = byTypeRaw.reduce(
      (acc, g) => {
        acc[g.type] = g._count.type;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalSent = metricsAgg._sum.sentCount ?? 0;
    const totalDelivered = metricsAgg._sum.deliveredCount ?? 0;
    const totalOpened = metricsAgg._sum.openedCount ?? 0;
    const totalClicked = metricsAgg._sum.clickedCount ?? 0;
    const totalConverted = metricsAgg._sum.convertedCount ?? 0;

    // by_channel: fetch campaigns and aggregate channels in JS
    // (Prisma arrays can't be groupBy'd natively)
    const campaigns = await this.prisma.campaign.findMany({
      where,
      select: { channels: true },
    });
    const byChannel = campaigns.reduce(
      (acc, c) => {
        (c.channels as string[]).forEach((ch) => {
          acc[ch] = (acc[ch] || 0) + 1;
        });
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      active,
      draft,
      completed,
      paused,
      by_type: byType,
      by_channel: byChannel,
      metrics: {
        total_sent: totalSent,
        total_delivered: totalDelivered,
        total_opened: totalOpened,
        total_clicked: totalClicked,
        total_converted: totalConverted,
        delivery_rate:
          totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
        open_rate:
          totalDelivered > 0
            ? Math.round((totalOpened / totalDelivered) * 100)
            : 0,
        click_rate:
          totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 0,
        conversion_rate:
          totalSent > 0 ? Math.round((totalConverted / totalSent) * 100) : 0,
      },
    };
  }

  // ── Automated campaign helpers ───────────────────────────────────────────

  async createBirthdayCampaign(organizationId: string): Promise<Campaign> {
    return this.create({
      organization_id: organizationId,
      name: 'Birthday Campaign',
      description: 'Automated birthday wishes with special offer',
      type: CampaignType.BIRTHDAY,
      channels: [CampaignChannel.WHATSAPP, CampaignChannel.EMAIL],
      is_automated: true,
      whatsapp_template_id: 'birthday_offer_mx',
      email_subject: '¡Feliz Cumpleaños! 🎂 Regalo especial para ti',
      email_body:
        'Celebra tu cumpleaños con nosotros y recibe un descuento especial.',
      offer_code: 'BIRTHDAY2025',
      offer_discount_percent: 20,
    });
  }

  async createWelcomeCampaign(organizationId: string): Promise<Campaign> {
    return this.create({
      organization_id: organizationId,
      name: 'Welcome Series',
      description: 'Automated welcome campaign for new customers',
      type: CampaignType.WELCOME,
      channels: [CampaignChannel.EMAIL, CampaignChannel.WHATSAPP],
      is_automated: true,
      email_subject: '¡Bienvenido a nuestra cafetería! ☕',
      email_body:
        'Gracias por unirte a nuestra comunidad. Disfruta de tu primera compra.',
      offer_code: 'WELCOME10',
      offer_discount_percent: 10,
    });
  }
}
