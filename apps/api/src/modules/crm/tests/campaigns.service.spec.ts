import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CampaignsService } from '../campaigns.service';
import { PrismaService } from '../../database/prisma.service';
import { CampaignStatus, CampaignType, CampaignChannel } from '../dto';

describe('CampaignsService', () => {
  let service: CampaignsService;

  const mockPrismaService = {
    campaign: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    campaignRecipient: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockCampaign = {
    id: 'camp-1',
    organizationId: 'org-1',
    name: 'Promo Verano',
    description: 'Descuentos de verano',
    type: 'PROMOTIONAL',
    status: 'DRAFT',
    channels: ['EMAIL', 'WHATSAPP'],
    segmentId: null,
    startDate: null,
    endDate: null,
    isAutomated: false,
    emailSubject: null,
    emailBody: null,
    whatsappTemplateId: null,
    smsMessage: null,
    pushTitle: null,
    pushBody: null,
    offerCode: 'VERANO20',
    offerDescription: null,
    offerDiscountPercent: 20,
    offerDiscountAmount: null,
    totalRecipients: 0,
    sentCount: 0,
    deliveredCount: 0,
    openedCount: 0,
    clickedCount: 0,
    convertedCount: 0,
    unsubscribedCount: 0,
    createdByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecipient = {
    id: 'recip-1',
    campaignId: 'camp-1',
    customerId: 'cust-1',
    channel: 'EMAIL',
    sentAt: null,
    deliveredAt: null,
    openedAt: null,
    clickedAt: null,
    convertedAt: null,
    unsubscribedAt: null,
    errorMessage: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a campaign with DRAFT status', async () => {
      mockPrismaService.campaign.create.mockResolvedValue(mockCampaign);

      const result = await service.create({
        organization_id: 'org-1',
        name: 'Promo Verano',
        type: CampaignType.PROMOTIONAL,
        channels: [CampaignChannel.EMAIL, CampaignChannel.WHATSAPP],
        is_automated: false,
        offer_code: 'VERANO20',
        offer_discount_percent: 20,
      });

      expect(result.status).toBe(CampaignStatus.DRAFT);
      expect(result.name).toBe('Promo Verano');
      expect(result.channels).toContain(CampaignChannel.EMAIL);
    });
  });

  describe('findAll', () => {
    it('should filter by organization_id', async () => {
      mockPrismaService.campaign.findMany.mockResolvedValue([mockCampaign]);
      await service.findAll({ organization_id: 'org-1' });
      expect(mockPrismaService.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-1' }),
        }),
      );
    });

    it('should return empty array when no campaigns', async () => {
      mockPrismaService.campaign.findMany.mockResolvedValue([]);
      const result = await service.findAll({});
      expect(result).toHaveLength(0);
    });
  });

  describe('updateStatus', () => {
    it('should update campaign status', async () => {
      const activeCampaign = { ...mockCampaign, status: 'ACTIVE' };
      mockPrismaService.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.campaign.update.mockResolvedValue(activeCampaign);

      const result = await service.updateStatus('camp-1', CampaignStatus.ACTIVE);
      expect(result.status).toBe(CampaignStatus.ACTIVE);
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrismaService.campaign.findUnique.mockResolvedValue(null);
      await expect(service.updateStatus('bad-id', CampaignStatus.ACTIVE)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('recipients', () => {
    beforeEach(() => {
      // $transaction mock: execute callback with prisma mock, return array
      mockPrismaService.$transaction.mockImplementation((ops: any[]) =>
        Promise.resolve(ops),
      );
    });

    it('should add recipient and increment total_recipients', async () => {
      mockPrismaService.campaignRecipient.create.mockResolvedValue(mockRecipient);
      mockPrismaService.campaign.update.mockResolvedValue({
        ...mockCampaign,
        totalRecipients: 1,
      });

      // $transaction returns [recipient, updatedCampaign]
      mockPrismaService.$transaction.mockResolvedValue([
        mockRecipient,
        { ...mockCampaign, totalRecipients: 1 },
      ]);

      const result = await service.addRecipient('camp-1', 'cust-1', CampaignChannel.EMAIL);

      expect(result.campaign_id).toBe('camp-1');
      expect(result.customer_id).toBe('cust-1');
      expect(result.channel).toBe(CampaignChannel.EMAIL);
    });

    it('should mark sent and increment sent_count', async () => {
      mockPrismaService.campaignRecipient.findUnique.mockResolvedValue(mockRecipient);
      mockPrismaService.$transaction.mockResolvedValue([
        { ...mockRecipient, sentAt: new Date() },
        { ...mockCampaign, sentCount: 1 },
      ]);

      await service.markSent('recip-1');

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should not double-count opened events', async () => {
      const alreadyOpened = { ...mockRecipient, openedAt: new Date() };
      mockPrismaService.campaignRecipient.findUnique.mockResolvedValue(alreadyOpened);

      await service.markOpened('recip-1');

      // $transaction should NOT be called since openedAt already set
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should not double-count clicked events', async () => {
      const alreadyClicked = { ...mockRecipient, clickedAt: new Date() };
      mockPrismaService.campaignRecipient.findUnique.mockResolvedValue(alreadyClicked);

      await service.markClicked('recip-1');
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should not double-count converted events', async () => {
      const alreadyConverted = { ...mockRecipient, convertedAt: new Date() };
      mockPrismaService.campaignRecipient.findUnique.mockResolvedValue(alreadyConverted);

      await service.markConverted('recip-1');
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should not double-count unsubscribed events', async () => {
      const alreadyUnsub = { ...mockRecipient, unsubscribedAt: new Date() };
      mockPrismaService.campaignRecipient.findUnique.mockResolvedValue(alreadyUnsub);

      await service.markUnsubscribed('recip-1');
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should return campaign recipients', async () => {
      mockPrismaService.campaignRecipient.findMany.mockResolvedValue([mockRecipient]);
      const result = await service.getCampaignRecipients('camp-1');
      expect(result).toHaveLength(1);
      expect(result[0].campaign_id).toBe('camp-1');
    });
  });

  describe('getStats', () => {
    it('should return campaign statistics with rates', async () => {
      mockPrismaService.campaign.count
        .mockResolvedValueOnce(5)  // total
        .mockResolvedValueOnce(2)  // active
        .mockResolvedValueOnce(2)  // draft
        .mockResolvedValueOnce(1)  // completed
        .mockResolvedValueOnce(0); // paused

      mockPrismaService.campaign.groupBy.mockResolvedValue([
        { type: 'PROMOTIONAL', _count: { type: 3 } },
        { type: 'BIRTHDAY', _count: { type: 2 } },
      ]);

      mockPrismaService.campaign.aggregate.mockResolvedValue({
        _sum: {
          sentCount: 1000,
          deliveredCount: 950,
          openedCount: 400,
          clickedCount: 100,
          convertedCount: 50,
        },
      });

      mockPrismaService.campaign.findMany.mockResolvedValue([
        { channels: ['EMAIL', 'WHATSAPP'] },
        { channels: ['EMAIL'] },
      ]);

      const stats = await service.getStats('org-1');

      expect(stats.total).toBe(5);
      expect(stats.active).toBe(2);
      expect(stats.metrics.total_sent).toBe(1000);
      expect(stats.metrics.delivery_rate).toBe(95); // 950/1000*100
      expect(stats.metrics.open_rate).toBe(42); // 400/950*100
      expect(stats.by_type.PROMOTIONAL).toBe(3);
      expect(stats.by_channel.EMAIL).toBe(2);
    });
  });
});
