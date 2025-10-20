export interface RFMSegment {
  name: string;
  description: string;
  recency_min: number; // Days since last purchase
  recency_max: number;
  frequency_min: number; // Number of purchases
  frequency_max: number;
  monetary_min: number; // Total spent
  monetary_max: number;
  color: string; // For UI visualization
  priority: number; // 1 = highest priority
}

export interface CustomerRFMScore {
  customer_id: string;
  recency_days: number; // Days since last purchase
  recency_score: number; // 1-5 (5 = most recent)
  frequency_count: number; // Total purchases
  frequency_score: number; // 1-5 (5 = most frequent)
  monetary_total: number; // Total spent
  monetary_score: number; // 1-5 (5 = highest spender)
  rfm_score: string; // e.g., "555" = Champions
  segment_name: string; // Champions, Loyal, At Risk, etc.
  calculated_at: Date;
}

// Standard RFM Segments
export const RFM_SEGMENTS: RFMSegment[] = [
  {
    name: 'Champions',
    description: 'Bought recently, buy often, and spend the most',
    recency_min: 0,
    recency_max: 30,
    frequency_min: 10,
    frequency_max: 999,
    monetary_min: 5000,
    monetary_max: 999999,
    color: '#10b981', // green
    priority: 1,
  },
  {
    name: 'Loyal Customers',
    description: 'Buy regularly and spend good money',
    recency_min: 0,
    recency_max: 60,
    frequency_min: 5,
    frequency_max: 999,
    monetary_min: 2000,
    monetary_max: 999999,
    color: '#3b82f6', // blue
    priority: 2,
  },
  {
    name: 'Potential Loyalists',
    description: 'Recent customers with average frequency and spending',
    recency_min: 0,
    recency_max: 45,
    frequency_min: 3,
    frequency_max: 9,
    monetary_min: 1000,
    monetary_max: 4999,
    color: '#8b5cf6', // purple
    priority: 3,
  },
  {
    name: 'Recent Customers',
    description: 'Bought recently but not frequently',
    recency_min: 0,
    recency_max: 30,
    frequency_min: 1,
    frequency_max: 2,
    monetary_min: 0,
    monetary_max: 999999,
    color: '#06b6d4', // cyan
    priority: 4,
  },
  {
    name: 'Promising',
    description: 'Recent shoppers with potential for growth',
    recency_min: 0,
    recency_max: 60,
    frequency_min: 1,
    frequency_max: 4,
    monetary_min: 500,
    monetary_max: 1999,
    color: '#14b8a6', // teal
    priority: 5,
  },
  {
    name: 'Need Attention',
    description: 'Above average recency, frequency, and monetary',
    recency_min: 31,
    recency_max: 90,
    frequency_min: 3,
    frequency_max: 999,
    monetary_min: 1000,
    monetary_max: 999999,
    color: '#f59e0b', // amber
    priority: 6,
  },
  {
    name: 'About To Sleep',
    description: 'Below average recency and frequency',
    recency_min: 61,
    recency_max: 120,
    frequency_min: 1,
    frequency_max: 4,
    monetary_min: 0,
    monetary_max: 999999,
    color: '#f97316', // orange
    priority: 7,
  },
  {
    name: 'At Risk',
    description: 'Spent big money but haven\'t returned for a while',
    recency_min: 91,
    recency_max: 180,
    frequency_min: 3,
    frequency_max: 999,
    monetary_min: 2000,
    monetary_max: 999999,
    color: '#ef4444', // red
    priority: 8,
  },
  {
    name: 'Cannot Lose Them',
    description: 'Made big purchases and often but long time ago',
    recency_min: 121,
    recency_max: 999,
    frequency_min: 5,
    frequency_max: 999,
    monetary_min: 3000,
    monetary_max: 999999,
    color: '#dc2626', // dark red
    priority: 9,
  },
  {
    name: 'Hibernating',
    description: 'Last purchase was long ago, low spenders',
    recency_min: 121,
    recency_max: 999,
    frequency_min: 1,
    frequency_max: 4,
    monetary_min: 0,
    monetary_max: 2999,
    color: '#6b7280', // gray
    priority: 10,
  },
  {
    name: 'Lost',
    description: 'Lowest recency, frequency, and monetary scores',
    recency_min: 181,
    recency_max: 999,
    frequency_min: 1,
    frequency_max: 2,
    monetary_min: 0,
    monetary_max: 999,
    color: '#4b5563', // dark gray
    priority: 11,
  },
];
