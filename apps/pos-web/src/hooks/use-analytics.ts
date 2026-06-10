import { useQuery } from '@tanstack/react-query';
import analyticsService, {
  QueryAnalyticsParams,
} from '@/services/analytics.service';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';

const ANALYTICS_QUERY_KEY = 'analytics';

export const useKPIDashboard = (
  params?: Omit<QueryAnalyticsParams, 'organization_id'>,
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, 'kpis', user?.organizationId, params],
    queryFn: () =>
      analyticsService.getKPIDashboard({
        organization_id: user!.organizationId,
        ...params,
      }),
    enabled: !!user?.organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useDashboardSummary = (
  params?: Omit<QueryAnalyticsParams, 'organization_id'>,
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, 'summary', user?.organizationId, params],
    queryFn: () =>
      analyticsService.getDashboardSummary({
        organization_id: user!.organizationId,
        ...params,
      }),
    enabled: !!user?.organizationId,
    staleTime: 2 * 60 * 1000,
  });
};

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start_date: start.toISOString(),
    end_date: end.toISOString(),
  };
}

export function useSalesMetrics(dateRange?: {
  start_date: string;
  end_date: string;
}) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';
  const range = dateRange || defaultDateRange();

  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, 'sales-metrics', organizationId, range],
    queryFn: () =>
      api.get(
        `/analytics/sales?organization_id=${organizationId}&start_date=${range.start_date}&end_date=${range.end_date}`,
      ),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopProducts(dateRange?: {
  start_date: string;
  end_date: string;
}) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';
  const range = dateRange || defaultDateRange();

  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, 'top-products', organizationId, range],
    queryFn: () =>
      api.get(
        `/analytics/sales/top-products?organization_id=${organizationId}&start_date=${range.start_date}&end_date=${range.end_date}`,
      ),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSalesByCategory(dateRange?: {
  start_date: string;
  end_date: string;
}) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';
  const range = dateRange || defaultDateRange();

  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, 'by-category', organizationId, range],
    queryFn: () =>
      api.get(
        `/analytics/sales/by-category?organization_id=${organizationId}&start_date=${range.start_date}&end_date=${range.end_date}`,
      ),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSalesTrend(
  granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
  dateRange?: { start_date: string; end_date: string },
) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';
  const range = dateRange || defaultDateRange();

  return useQuery({
    queryKey: [
      ANALYTICS_QUERY_KEY,
      'trend',
      organizationId,
      granularity,
      range,
    ],
    queryFn: () =>
      api.get(
        `/analytics/sales/trend?organization_id=${organizationId}&start_date=${range.start_date}&end_date=${range.end_date}&granularity=${granularity}`,
      ),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
