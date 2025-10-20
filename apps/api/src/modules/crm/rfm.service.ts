import { Injectable } from '@nestjs/common';
import { CustomerRFMScore, RFM_SEGMENTS } from './interfaces';

@Injectable()
export class RFMService {
  // Mock customer purchases for RFM calculation
  private customerPurchases: Map<string, any[]> = new Map();

  async calculateCustomerRFM(customerId: string): Promise<CustomerRFMScore | null> {
    const purchases = this.customerPurchases.get(customerId) || [];
    if (purchases.length === 0) {
      return null;
    }

    const now = new Date();

    // Calculate Recency (days since last purchase)
    const lastPurchase = purchases[purchases.length - 1];
    const recencyDays = Math.floor(
      (now.getTime() - lastPurchase.date.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Calculate Frequency (total number of purchases)
    const frequencyCount = purchases.length;

    // Calculate Monetary (total amount spent)
    const monetaryTotal = purchases.reduce((sum, p) => sum + p.total, 0);

    // Score Recency (1-5, where 5 is most recent)
    const recencyScore = this.scoreRecency(recencyDays);

    // Score Frequency (1-5, where 5 is most frequent)
    const frequencyScore = this.scoreFrequency(frequencyCount);

    // Score Monetary (1-5, where 5 is highest spender)
    const monetaryScore = this.scoreMonetary(monetaryTotal);

    // Determine segment based on scores
    const rfmScore = `${recencyScore}${frequencyScore}${monetaryScore}`;
    const segmentName = this.determineSegment(recencyDays, frequencyCount, monetaryTotal);

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

  private determineSegment(recency: number, frequency: number, monetary: number): string {
    // Find matching segment based on RFM values
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

  async getSegmentDistribution(organizationId: string): Promise<any> {
    // This would query actual customer data
    // For now, return mock distribution
    return {
      Champions: 15,
      'Loyal Customers': 25,
      'Potential Loyalists': 20,
      'Recent Customers': 10,
      'Need Attention': 8,
      'At Risk': 7,
      'Cannot Lose Them': 5,
      Hibernating: 6,
      Lost: 4,
    };
  }

  // Mock method to record a purchase
  async recordPurchase(customerId: string, total: number, date: Date = new Date()): Promise<void> {
    const purchases = this.customerPurchases.get(customerId) || [];
    purchases.push({ total, date });
    this.customerPurchases.set(customerId, purchases);
  }
}
