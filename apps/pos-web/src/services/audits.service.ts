import api from '@/lib/api';
import { Audit, AuditStats, AuditType, AuditResult } from '@/types';

export interface CreateAuditDto {
  location_id: string;
  type: AuditType;
  audit_date: string;
  auditor_name: string;
  auditor_organization?: string;
  result: AuditResult;
  score?: number;
  findings: string;
  corrective_actions: string;
  completion_deadline?: string;
  documents_url?: string;
  notes?: string;
}

export interface UpdateAuditDto {
  type?: AuditType;
  audit_date?: string;
  auditor_name?: string;
  auditor_organization?: string;
  result?: AuditResult;
  score?: number;
  findings?: string;
  corrective_actions?: string;
  completion_deadline?: string;
  completion_date?: string;
  is_completed?: boolean;
  documents_url?: string;
  notes?: string;
}

export interface QueryAuditsParams {
  location_id?: string;
  type?: AuditType;
  result?: AuditResult;
  is_completed?: boolean;
  date_from?: string;
  date_to?: string;
}

class AuditsService {
  async createAudit(
    organizationId: string,
    data: CreateAuditDto,
  ): Promise<Audit> {
    return api.post(`/audits`, {
      organization_id: organizationId,
      ...data,
    });
  }

  async getAudits(
    organizationId: string,
    params?: QueryAuditsParams,
  ): Promise<Audit[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('organization_id', organizationId);

    if (params?.location_id)
      queryParams.append('location_id', params.location_id);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.result) queryParams.append('result', params.result);
    if (params?.is_completed !== undefined)
      queryParams.append('is_completed', String(params.is_completed));
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    return api.get(`/audits?${queryParams.toString()}`);
  }

  async getAudit(id: string): Promise<Audit> {
    return api.get(`/audits/${id}`);
  }

  async updateAudit(id: string, data: UpdateAuditDto): Promise<Audit> {
    return api.patch(`/audits/${id}`, data);
  }

  async completeAudit(id: string, completionDate: string): Promise<Audit> {
    return api.patch(`/audits/${id}/complete`, {
      completion_date: completionDate,
    });
  }

  async deleteAudit(id: string): Promise<void> {
    return api.delete(`/audits/${id}`);
  }

  async getOpenActions(organizationId: string): Promise<Audit[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('organization_id', organizationId);

    return api.get(`/audits/open-actions?${queryParams.toString()}`);
  }

  async getStats(organizationId: string): Promise<AuditStats> {
    const queryParams = new URLSearchParams();
    queryParams.append('organization_id', organizationId);

    return api.get(`/audits/stats?${queryParams.toString()}`);
  }
}

export default new AuditsService();
