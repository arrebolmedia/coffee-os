import { api } from '@/lib/api';
import { ProfitAndLoss, PnLComparison } from '@/types';

interface PnLQueryParams {
  organization_id: string;
  start_date: string;
  end_date: string;
  location_id?: string;
}

interface MonthlyPnLParams {
  organization_id: string;
  year: number;
  month: number;
  location_id?: string;
}

interface YearlyPnLParams {
  organization_id: string;
  year: number;
  location_id?: string;
}

interface ComparePnLParams {
  organization_id: string;
  period1_start: string;
  period1_end: string;
  period2_start: string;
  period2_end: string;
  location_id?: string;
}

class PnLService {
  /**
   * Calculate P&L for a custom date range
   */
  async calculatePnL(params: PnLQueryParams): Promise<ProfitAndLoss> {
    const queryString = new URLSearchParams(params as any).toString();
    return api.get<ProfitAndLoss>(`/finance/pnl?${queryString}`);
  }

  /**
   * Calculate P&L for a specific month
   */
  async calculateMonthlyPnL(params: MonthlyPnLParams): Promise<ProfitAndLoss> {
    const queryString = new URLSearchParams(params as any).toString();
    return api.get<ProfitAndLoss>(`/finance/pnl/monthly?${queryString}`);
  }

  /**
   * Calculate P&L for a full year
   */
  async calculateYearlyPnL(params: YearlyPnLParams): Promise<ProfitAndLoss> {
    const queryString = new URLSearchParams(params as any).toString();
    return api.get<ProfitAndLoss>(`/finance/pnl/yearly?${queryString}`);
  }

  /**
   * Compare P&L between two periods
   */
  async comparePeriods(params: ComparePnLParams): Promise<PnLComparison> {
    const queryString = new URLSearchParams(params as any).toString();
    return api.get<PnLComparison>(`/finance/pnl/compare?${queryString}`);
  }
}

export const pnlService = new PnLService();
