import { Injectable } from '@nestjs/common';
import { CreateCampaignDto, QueryCampaignsDto, CampaignStatus, CampaignType, CampaignChannel } from './dto';
import { Campaign, CampaignRecipient } from './interfaces';

@Injectable()
export class CampaignsService {
  private campaigns: Map<string, Campaign> = new Map();
  private recipients: Map<string, CampaignRecipient> = new Map();

  async create(createDto: CreateCampaignDto, createdByUserId?: string): Promise<Campaign> {
    const id = this.generateId();
    const now = new Date();

    const campaign: Campaign = {
      id,
      organization_id: createDto.organization_id,
      name: createDto.name,
      description: createDto.description,
      type: createDto.type,
      status: CampaignStatus.DRAFT,
      channels: createDto.channels,
      segment_id: createDto.segment_id,
      start_date: createDto.start_date ? new Date(createDto.start_date) : undefined,
      end_date: createDto.end_date ? new Date(createDto.end_date) : undefined,
      is_automated: createDto.is_automated,

      // Message content
      email_subject: createDto.email_subject,
      email_body: createDto.email_body,
      whatsapp_template_id: createDto.whatsapp_template_id,
      sms_message: createDto.sms_message,
      push_title: createDto.push_title,
      push_body: createDto.push_body,

      // Offer
      offer_code: createDto.offer_code,
      offer_description: createDto.offer_description,
      offer_discount_percent: createDto.offer_discount_percent,
      offer_discount_amount: createDto.offer_discount_amount,

      // Metrics
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      converted_count: 0,
      unsubscribed_count: 0,

      created_by_user_id: createdByUserId,
      created_at: now,
      updated_at: now,
    };

    this.campaigns.set(id, campaign);
    return campaign;
  }

  async findAll(query: QueryCampaignsDto): Promise<Campaign[]> {
    let campaigns = Array.from(this.campaigns.values());

    if (query.organization_id) {
      campaigns = campaigns.filter((c) => c.organization_id === query.organization_id);
    }

    if (query.type) {
      campaigns = campaigns.filter((c) => c.type === query.type);
    }

    if (query.status) {
      campaigns = campaigns.filter((c) => c.status === query.status);
    }

    if (query.search) {
      const search = query.search.toLowerCase();
      campaigns = campaigns.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.description?.toLowerCase().includes(search),
      );
    }

    return campaigns.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async findOne(id: string): Promise<Campaign | null> {
    return this.campaigns.get(id) || null;
  }

  async updateStatus(id: string, status: CampaignStatus): Promise<Campaign> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    campaign.status = status;
    campaign.updated_at = new Date();

    this.campaigns.set(id, campaign);
    return campaign;
  }

  async delete(id: string): Promise<void> {
    this.campaigns.delete(id);
  }

  async addRecipient(campaignId: string, customerId: string, channel: CampaignChannel): Promise<CampaignRecipient> {
    const id = this.generateId();

    const recipient: CampaignRecipient = {
      id,
      campaign_id: campaignId,
      customer_id: customerId,
      channel,
    };

    this.recipients.set(id, recipient);

    // Update campaign total_recipients
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.total_recipients = (campaign.total_recipients || 0) + 1;
      this.campaigns.set(campaignId, campaign);
    }

    return recipient;
  }

  async markSent(recipientId: string): Promise<void> {
    const recipient = this.recipients.get(recipientId);
    if (!recipient) return;

    recipient.sent_at = new Date();
    this.recipients.set(recipientId, recipient);

    // Update campaign sent_count
    const campaign = this.campaigns.get(recipient.campaign_id);
    if (campaign) {
      campaign.sent_count += 1;
      this.campaigns.set(recipient.campaign_id, campaign);
    }
  }

  async markDelivered(recipientId: string): Promise<void> {
    const recipient = this.recipients.get(recipientId);
    if (!recipient) return;

    recipient.delivered_at = new Date();
    this.recipients.set(recipientId, recipient);

    // Update campaign delivered_count
    const campaign = this.campaigns.get(recipient.campaign_id);
    if (campaign) {
      campaign.delivered_count += 1;
      this.campaigns.set(recipient.campaign_id, campaign);
    }
  }

  async markOpened(recipientId: string): Promise<void> {
    const recipient = this.recipients.get(recipientId);
    if (!recipient) return;

    if (!recipient.opened_at) {
      recipient.opened_at = new Date();
      this.recipients.set(recipientId, recipient);

      // Update campaign opened_count
      const campaign = this.campaigns.get(recipient.campaign_id);
      if (campaign) {
        campaign.opened_count += 1;
        this.campaigns.set(recipient.campaign_id, campaign);
      }
    }
  }

  async markClicked(recipientId: string): Promise<void> {
    const recipient = this.recipients.get(recipientId);
    if (!recipient) return;

    if (!recipient.clicked_at) {
      recipient.clicked_at = new Date();
      this.recipients.set(recipientId, recipient);

      // Update campaign clicked_count
      const campaign = this.campaigns.get(recipient.campaign_id);
      if (campaign) {
        campaign.clicked_count += 1;
        this.campaigns.set(recipient.campaign_id, campaign);
      }
    }
  }

  async markConverted(recipientId: string): Promise<void> {
    const recipient = this.recipients.get(recipientId);
    if (!recipient) return;

    if (!recipient.converted_at) {
      recipient.converted_at = new Date();
      this.recipients.set(recipientId, recipient);

      // Update campaign converted_count
      const campaign = this.campaigns.get(recipient.campaign_id);
      if (campaign) {
        campaign.converted_count += 1;
        this.campaigns.set(recipient.campaign_id, campaign);
      }
    }
  }

  async markUnsubscribed(recipientId: string): Promise<void> {
    const recipient = this.recipients.get(recipientId);
    if (!recipient) return;

    if (!recipient.unsubscribed_at) {
      recipient.unsubscribed_at = new Date();
      this.recipients.set(recipientId, recipient);

      // Update campaign unsubscribed_count
      const campaign = this.campaigns.get(recipient.campaign_id);
      if (campaign) {
        campaign.unsubscribed_count += 1;
        this.campaigns.set(recipient.campaign_id, campaign);
      }
    }
  }

  async getCampaignRecipients(campaignId: string): Promise<CampaignRecipient[]> {
    return Array.from(this.recipients.values()).filter((r) => r.campaign_id === campaignId);
  }

  async getStats(organizationId: string): Promise<any> {
    const campaigns = Array.from(this.campaigns.values()).filter(
      (c) => c.organization_id === organizationId,
    );

    const total = campaigns.length;
    const active = campaigns.filter((c) => c.status === CampaignStatus.ACTIVE).length;
    const draft = campaigns.filter((c) => c.status === CampaignStatus.DRAFT).length;
    const completed = campaigns.filter((c) => c.status === CampaignStatus.COMPLETED).length;
    const paused = campaigns.filter((c) => c.status === CampaignStatus.PAUSED).length;

    const byType = campaigns.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byChannel = campaigns.reduce((acc, c) => {
      c.channels.forEach((channel) => {
        acc[channel] = (acc[channel] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    // Overall metrics
    const totalSent = campaigns.reduce((sum, c) => sum + c.sent_count, 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + c.delivered_count, 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + c.opened_count, 0);
    const totalClicked = campaigns.reduce((sum, c) => sum + c.clicked_count, 0);
    const totalConverted = campaigns.reduce((sum, c) => sum + c.converted_count, 0);

    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const openRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0;
    const clickRate = totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 0;
    const conversionRate = totalSent > 0 ? Math.round((totalConverted / totalSent) * 100) : 0;

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
        delivery_rate: deliveryRate,
        open_rate: openRate,
        click_rate: clickRate,
        conversion_rate: conversionRate,
      },
    };
  }

  // Automated campaign helpers
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
      email_body: 'Celebra tu cumpleaños con nosotros y recibe un descuento especial.',
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
      email_body: 'Gracias por unirte a nuestra comunidad. Disfruta de tu primera compra.',
      offer_code: 'WELCOME10',
      offer_discount_percent: 10,
    });
  }

  private generateId(): string {
    return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
