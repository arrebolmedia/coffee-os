import { Injectable } from '@nestjs/common';
import { CustomerRFMScore, RFM_SEGMENTS } from './interfaces';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class RFMService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateCustomerRFM(
    customerId: string,
  ): Promise<CustomerRFMScore | null> {
    // Recency: date of last EARN transaction
    const lastTx = await this.prisma.loyaltyTransaction.findFirst({
      where: { customerId, type: 'EARN' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (!lastTx) return null;

    const now = new Date();
    const recencyDays = Math.floor(
      (now.getTime() - lastTx.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Frequency: count of EARN transactions
    const frequencyCount = await this.prisma.loyaltyTransaction.count({
      where: { customerId, type: 'EARN' },
    });

    // Monetary: total order spend from EARN transactions
    const monetaryAgg = await this.prisma.loyaltyTransaction.aggregate({
      where: { customerId, type: 'EARN' },
      _sum: { orderTotal: true },
    });
    const monetaryTotal = monetaryAgg._sum.orderTotal ?? 0;

    const recencyScore = this.scoreRecency(recencyDays);
    const frequencyScore = this.scoreFrequency(frequencyCount);
    const monetaryScore = this.scoreMonetary(monetaryTotal);

    const rfmScore = `${recencyScore}${frequencyScore}${monetaryScore}`;
    const segmentName = this.determineSegment(
      recencyDays,
      frequencyCount,
      monetaryTotal,
    );

    return {
      customer_id: customerId,
      recency_days: recencyDays,
      recency_score: recencyScore,
      frequency_count: frequencyCount,
      frequency_score: frequencyScore,
      monetary_total: monetaryTotal,
      monetary_score: monetaryScore,
      rfm_score: rfmScore,
      segment_name: segmentName,
      calculated_at: now,
    };
  }

  async getSegmentDistribution(organizationId: string): Promise<any> {
    const groups = await this.prisma.customer.groupBy({
      by: ['rfmSegment'],
      where: { organizationId, rfmSegment: { not: null } },
      _count: { rfmSegment: true },
    });

    return groups.reduce(
      (acc, g) => {
        if (g.rfmSegment) acc[g.rfmSegment] = g._count.rfmSegment;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private scoreRecency(days: number): number {
    if (days <= 7) return 5;
    if (days <= 30) return 4;
    if (days <= 60) return 3;
    if (days <= 120) return 2;
    return 1;
  }

  private scoreFrequency(count: number): number {
    if (count >= 20) return 5;
    if (count >= 10) return 4;
    if (count >= 5) return 3;
    if (count >= 2) return 2;
    return 1;
  }

  private scoreMonetary(total: number): number {
    if (total >= 10000) return 5;
    if (total >= 5000) return 4;
    if (total >= 2000) return 3;
    if (total >= 500) return 2;
    return 1;
  }

  private determineSegment(
    recency: number,
    frequency: number,
    monetary: number,
  ): string {
    for (const segment of RFM_SEGMENTS) {
      if (
        recency >= segment.recency_min &&
        recency <= segment.recency_max &&
        frequency >= segment.frequency_min &&
        frequency <= segment.frequency_max &&
        monetary >= segment.monetary_min &&
        monetary <= segment.monetary_max
      ) {
        return segment.name;
      }
    }
    return 'Unknown';
  }
}
