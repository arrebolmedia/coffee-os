import api from '@/lib/api';
import {
  WasteLog,
  WasteStats,
  WasteCategory,
  WasteReason,
  DisposalMethod,
} from '@/types';

export interface CreateWasteLogDto {
  organization_id: string;
  location_id?: string;
  inventory_item_id?: string;
  product_id?: string;
  item_name: string;
  category: WasteCategory;
  reason: WasteReason;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  disposal_method: DisposalMethod;
  disposal_date?: string;
  recorded_by: string;
  notes?: string;
  image_url?: string;
}

export interface UpdateWasteLogDto {
  item_name?: string;
  category?: WasteCategory;
  reason?: WasteReason;
  quantity?: number;
  unit?: string;
  cost_per_unit?: number;
  disposal_method?: DisposalMethod;
  disposal_date?: string;
  notes?: string;
  image_url?: string;
}

export interface QueryWasteLogsParams {
  organization_id?: string;
  location_id?: string;
  category?: WasteCategory;
  reason?: WasteReason;
  disposal_method?: DisposalMethod;
  date_from?: string;
  date_to?: string;
}

class WasteService {
  /**
   * Crear registro de desperdicio
   */
  async createWasteLog(data: CreateWasteLogDto): Promise<WasteLog> {
    return api.post('/waste/logs', data);
  }

  /**
   * Obtener lista de waste logs
   */
  async getWasteLogs(params?: QueryWasteLogsParams): Promise<WasteLog[]> {
    const queryParams = new URLSearchParams();

    if (params?.organization_id)
      queryParams.append('organization_id', params.organization_id);
    if (params?.location_id)
      queryParams.append('location_id', params.location_id);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.reason) queryParams.append('reason', params.reason);
    if (params?.disposal_method)
      queryParams.append('disposal_method', params.disposal_method);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    return api.get(`/waste/logs?${queryParams.toString()}`);
  }

  /**
   * Obtener waste log por ID
   */
  async getWasteLog(id: string): Promise<WasteLog> {
    return api.get(`/waste/logs/${id}`);
  }

  /**
   * Actualizar waste log
   */
  async updateWasteLog(id: string, data: UpdateWasteLogDto): Promise<WasteLog> {
    return api.patch(`/waste/logs/${id}`, data);
  }

  /**
   * Eliminar waste log
   */
  async deleteWasteLog(id: string): Promise<void> {
    return api.delete(`/waste/logs/${id}`);
  }

  /**
   * Obtener estadísticas de desperdicio
   */
  async getWasteStats(organizationId: string): Promise<WasteStats> {
    return api.get(`/waste/stats/${organizationId}`);
  }
}

export default new WasteService();
