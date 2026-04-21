import api from '@/lib/api';
import { DashboardKPIs, DashboardSummary } from '@/types';

export interface QueryAnalyticsParams {
  organization_id: string;
  location_id?: string;
  start_date?: string;
  end_date?: string;
}

class AnalyticsService {
  /**
   * Obtener KPIs del dashboard
   */
  async getKPIDashboard(params: QueryAnalyticsParams): Promise<DashboardKPIs> {
    const queryParams = new URLSearchParams();
    queryParams.append('organization_id', params.organization_id);

    if (params.location_id)
      queryParams.append('location_id', params.location_id);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);

    return api.get(`/analytics/dashboard/kpis?${queryParams.toString()}`);
  }

  /**
   * Obtener resumen completo del dashboard
   */
  async getDashboardSummary(
    params: QueryAnalyticsParams,
  ): Promise<DashboardSummary> {
    const queryParams = new URLSearchParams();
    queryParams.append('organization_id', params.organization_id);

    if (params.location_id)
      queryParams.append('location_id', params.location_id);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);

    return api.get(`/analytics/dashboard?${queryParams.toString()}`);
  }
}

export default new AnalyticsService();
