import { useQuery } from '@tanstack/react-query';
import analyticsService, {
  QueryAnalyticsParams,
} from '@/services/analytics.service';
import { useAuth } from '@/hooks/use-auth';

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
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};
