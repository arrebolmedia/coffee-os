import { useQuery } from '@tanstack/react-query';
import { pnlService } from '@/services/pnl.service';
import { useAuth } from '@/hooks/use-auth';
import { PnLComparison, ProfitAndLoss } from '@/types';

/**
 * Hook to calculate P&L for a custom date range
 */
export function usePnL(
  startDate: string,
  endDate: string,
  locationId?: string,
) {
  const { user } = useAuth();

  return useQuery<ProfitAndLoss>({
    queryKey: ['pnl', user?.organizationId, startDate, endDate, locationId],
    queryFn: () =>
      pnlService.calculatePnL({
        organization_id: user!.organizationId,
        start_date: startDate,
        end_date: endDate,
        location_id: locationId,
      }),
    enabled: !!user?.organizationId && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to calculate monthly P&L
 */
export function useMonthlyPnL(
  year: number,
  month: number,
  locationId?: string,
) {
  const { user } = useAuth();

  return useQuery<ProfitAndLoss>({
    queryKey: ['pnl', 'monthly', user?.organizationId, year, month, locationId],
    queryFn: () =>
      pnlService.calculateMonthlyPnL({
        organization_id: user!.organizationId,
        year,
        month,
        location_id: locationId,
      }),
    enabled: !!user?.organizationId && !!year && !!month,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to calculate yearly P&L
 */
export function useYearlyPnL(year: number, locationId?: string) {
  const { user } = useAuth();

  return useQuery<ProfitAndLoss>({
    queryKey: ['pnl', 'yearly', user?.organizationId, year, locationId],
    queryFn: () =>
      pnlService.calculateYearlyPnL({
        organization_id: user!.organizationId,
        year,
        location_id: locationId,
      }),
    enabled: !!user?.organizationId && !!year,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to compare P&L between two periods
 */
export function useComparePnL(
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string,
  locationId?: string,
) {
  const { user } = useAuth();

  return useQuery<PnLComparison>({
    queryKey: [
      'pnl',
      'compare',
      user?.organizationId,
      period1Start,
      period1End,
      period2Start,
      period2End,
      locationId,
    ],
    queryFn: () =>
      pnlService.comparePeriods({
        organization_id: user!.organizationId,
        period1_start: period1Start,
        period1_end: period1End,
        period2_start: period2Start,
        period2_end: period2End,
        location_id: locationId,
      }),
    enabled:
      !!user?.organizationId &&
      !!period1Start &&
      !!period1End &&
      !!period2Start &&
      !!period2End,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
