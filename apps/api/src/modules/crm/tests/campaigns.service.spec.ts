import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsService } from '../campaigns.service';
import { CampaignType, CampaignStatus, CampaignChannel } from '../dto';

describe('CampaignsService', () => {
  let service: CampaignsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CampaignsService],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
  });

  afterEach(() => {
    service['campaigns'].clear();
    service['recipients'].clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a campaign', async () => {
      const campaign = await service.create({
        organization_id: 'org_1',
        name: 'Birthday Campaign',
        type: CampaignType.BIRTHDAY,
        channels: [CampaignChannel.EMAIL, CampaignChannel.WHATSAPP],
        start_date: '2024-03-01',
        end_date: '2024-03-31',
        is_automated: true,
        email_subject: 'Happy Birthday!',
        whatsapp_template_id: 'birthday_template',
      }, 'user_1');

      expect(campaign.name).toBe('Birthday Campaign');
      expect(campaign.status).toBe(CampaignStatus.DRAFT);
      expect(campaign.channels).toHaveLength(2);
      expect(campaign.sent_count).toBe(0);
    });
  });

  describe('updateStatus', () => {
    it('should update campaign status', async () => {
      const campaign = await service.create({
        organization_id: 'org_1',
        name: 'Test Campaign',
        type: CampaignType.PROMOTIONAL,
        channels: [CampaignChannel.EMAIL],
        is_automated: false,
      }, 'user_1');

      const updated = await service.updateStatus(campaign.id, CampaignStatus.ACTIVE);

      expect(updated.status).toBe(CampaignStatus.ACTIVE);
    });
  });

  describe('recipients', () => {
    let campaignId: string;

    beforeEach(async () => {
      const campaign = await service.create({
        organization_id: 'org_1',
        name: 'Test Campaign',
        type: CampaignType.PROMOTIONAL,
        channels: [CampaignChannel.EMAIL],
        is_automated: false,
      }, 'user_1');
      campaignId = campaign.id;
    });

    it('should add a recipient', async () => {
      const recipient = await service.addRecipient(campaignId, 'customer_1', CampaignChannel.EMAIL);

      expect(recipient.customer_id).toBe('customer_1');
      expect(recipient.channel).toBe(CampaignChannel.EMAIL);
    });

    it('should track message sent', async () => {
      const recipient = await service.addRecipient(campaignId, 'customer_1', CampaignChannel.EMAIL);

      await service.markSent(recipient.id);
      
      const campaign = await service.findOne(campaignId);
      expect(campaign.sent_count).toBe(1);
    });

    it('should track message delivered', async () => {
      const recipient = await service.addRecipient(campaignId, 'customer_1', CampaignChannel.EMAIL);

      await service.markSent(recipient.id);
      await service.markDelivered(recipient.id);
      
      const campaign = await service.findOne(campaignId);
      expect(campaign.delivered_count).toBe(1);
    });

    it('should track message opened', async () => {
      const recipient = await service.addRecipient(campaignId, 'customer_1', CampaignChannel.EMAIL);

      await service.markOpened(recipient.id);
      
      const campaign = await service.findOne(campaignId);
      expect(campaign.opened_count).toBe(1);
    });

    it('should track message clicked', async () => {
      const recipient = await service.addRecipient(campaignId, 'customer_1', CampaignChannel.EMAIL);

      await service.markClicked(recipient.id);
      
      const campaign = await service.findOne(campaignId);
      expect(campaign.clicked_count).toBe(1);
    });

    it('should track conversion', async () => {
      const recipient = await service.addRecipient(campaignId, 'customer_1', CampaignChannel.EMAIL);

      await service.markConverted(recipient.id);
      
      const campaign = await service.findOne(campaignId);
      expect(campaign.converted_count).toBe(1);
    });

    it('should track unsubscribe', async () => {
      const recipient = await service.addRecipient(campaignId, 'customer_1', CampaignChannel.EMAIL);

      await service.markUnsubscribed(recipient.id);
      
      const campaign = await service.findOne(campaignId);
      expect(campaign.unsubscribed_count).toBe(1);
    });

    it('should not double count opened', async () => {
      const recipient = await service.addRecipient(campaignId, 'customer_1', CampaignChannel.EMAIL);

      await service.markOpened(recipient.id);
      await service.markOpened(recipient.id);
      
      const campaign = await service.findOne(campaignId);
      expect(campaign.opened_count).toBe(1);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      const campaign = await service.create({
        organization_id: 'org_1',
        name: 'Test Campaign',
        type: CampaignType.PROMOTIONAL,
        channels: [CampaignChannel.EMAIL],
        is_automated: false,
      }, 'user_1');

      const recipient1 = await service.addRecipient(campaign.id, 'customer_1', CampaignChannel.EMAIL);
      const recipient2 = await service.addRecipient(campaign.id, 'customer_2', CampaignChannel.EMAIL);
      const recipient3 = await service.addRecipient(campaign.id, 'customer_3', CampaignChannel.EMAIL);

      // Simulate campaign execution
      await service.markSent(recipient1.id);
      await service.markSent(recipient2.id);
      await service.markSent(recipient3.id);

      await service.markDelivered(recipient1.id);
      await service.markDelivered(recipient2.id);

      await service.markOpened(recipient1.id);

      await service.markClicked(recipient1.id);
      await service.markConverted(recipient1.id);
    });

    it('should return campaign statistics', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.total).toBe(1);
      expect(stats.metrics.total_sent).toBe(3);
      expect(stats.metrics.total_delivered).toBe(2);
      expect(stats.metrics.total_opened).toBe(1);
      expect(stats.metrics.total_clicked).toBe(1);
      expect(stats.metrics.total_converted).toBe(1);
    });

    it('should calculate campaign rates', async () => {
      const stats = await service.getStats('org_1');

      expect(stats.metrics.delivery_rate).toBe(67); // 2/3 * 100 = 66.67 -> 67
      expect(stats.metrics.open_rate).toBe(50); // 1/2 * 100 = 50
      expect(stats.metrics.click_rate).toBe(100); // 1/1 * 100 = 100
      expect(stats.metrics.conversion_rate).toBe(33); // 1/3 * 100 = 33.33 -> 33
    });
  });
});
