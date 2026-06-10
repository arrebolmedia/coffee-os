/**
 * CoffeeOS - Permits Service
 * Servicio para gestión de permisos y licencias
 */

import { api } from '@/lib/api';
import { Permit, PermitStats, PermitStatus, PermitType } from '@/types';

export interface CreatePermitDto {
  organization_id: string;
  location_id: string;
  type: PermitType;
  permit_number: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string;
  cost?: number;
  renewal_frequency?: string;
  responsible_person?: string;
  notes?: string;
  document_url?: string;
}

export interface UpdatePermitDto {
  permit_number?: string;
  issuing_authority?: string;
  expiry_date?: string;
  status?: PermitStatus;
  cost?: number;
  renewal_frequency?: string;
  responsible_person?: string;
  notes?: string;
  document_url?: string;
}

export interface QueryPermitsParams {
  organization_id?: string;
  location_id?: string;
  search?: string;
}

class PermitsService {
  private basePath = '/finance/permits';

  /**
   * Crear nuevo permiso
   */
  async createPermit(data: CreatePermitDto): Promise<Permit> {
    return api.post<Permit>(this.basePath, data);
  }

  /**
   * Obtener lista de permisos
   */
  async getPermits(params?: QueryPermitsParams): Promise<Permit[]> {
    const queryParams = new URLSearchParams();

    if (params?.organization_id)
      queryParams.append('organization_id', params.organization_id);
    if (params?.location_id)
      queryParams.append('location_id', params.location_id);
    if (params?.search) queryParams.append('search', params.search);

    return api.get<Permit[]>(`${this.basePath}?${queryParams.toString()}`);
  }

  /**
   * Obtener permiso por ID
   */
  async getPermit(id: string): Promise<Permit> {
    return api.get<Permit>(`${this.basePath}/${id}`);
  }

  /**
   * Actualizar permiso
   */
  async updatePermit(id: string, data: UpdatePermitDto): Promise<Permit> {
    return api.patch<Permit>(`${this.basePath}/${id}`, data);
  }

  /**
   * Renovar permiso
   */
  async renewPermit(
    id: string,
    expiryDate: string,
    renewalCost?: number,
  ): Promise<Permit> {
    return api.post<Permit>(`${this.basePath}/${id}/renew`, {
      expiry_date: expiryDate,
      renewal_cost: renewalCost,
    });
  }

  /**
   * Eliminar permiso
   */
  async deletePermit(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  /**
   * Obtener permisos próximos a vencer
   */
  async getExpiringSoon(
    organizationId: string,
    days: number = 30,
  ): Promise<Permit[]> {
    return api.get<Permit[]>(
      `${this.basePath}/expiring-soon?organization_id=${organizationId}&days=${days}`,
    );
  }

  /**
   * Obtener permisos vencidos
   */
  async getExpired(organizationId: string): Promise<Permit[]> {
    return api.get<Permit[]>(
      `${this.basePath}/expired?organization_id=${organizationId}`,
    );
  }

  /**
   * Obtener estadísticas de permisos
   */
  async getStats(
    organizationId: string,
    locationId?: string,
  ): Promise<PermitStats> {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (locationId) params.append('location_id', locationId);

    return api.get<PermitStats>(`${this.basePath}/stats?${params.toString()}`);
  }
}

export const permitsService = new PermitsService();
