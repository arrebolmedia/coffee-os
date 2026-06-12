/**
 * CoffeeOS - Audits Service
 *
 * MÓDULO SIN BACKEND: no existe ningún controller `/audits` en CoffeeOS API.
 * Todos los métodos lanzan un Error explícito en lugar de pegar a rutas
 * fantasma (404 silencioso). La página /audits muestra un empty-state
 * permanente.
 *
 * TODO(backend): implementar el módulo audits en apps/api (controller +
 * service + modelo Prisma) y reconectar estos métodos.
 */

import { Audit, AuditResult, AuditStats, AuditType } from '@/types';

const NOT_IMPLEMENTED = () =>
  new Error(
    'Módulo de auditorías no disponible: el backend /audits aún no existe en CoffeeOS API.',
  );

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
    _organizationId: string,
    _data: CreateAuditDto,
  ): Promise<Audit> {
    throw NOT_IMPLEMENTED();
  }

  async getAudits(
    _organizationId: string,
    _params?: QueryAuditsParams,
  ): Promise<Audit[]> {
    throw NOT_IMPLEMENTED();
  }

  async getAudit(_id: string): Promise<Audit> {
    throw NOT_IMPLEMENTED();
  }

  async updateAudit(_id: string, _data: UpdateAuditDto): Promise<Audit> {
    throw NOT_IMPLEMENTED();
  }

  async completeAudit(_id: string, _completionDate: string): Promise<Audit> {
    throw NOT_IMPLEMENTED();
  }

  async deleteAudit(_id: string): Promise<void> {
    throw NOT_IMPLEMENTED();
  }

  async getOpenActions(_organizationId: string): Promise<Audit[]> {
    throw NOT_IMPLEMENTED();
  }

  async getStats(_organizationId: string): Promise<AuditStats> {
    throw NOT_IMPLEMENTED();
  }
}

export default new AuditsService();
