import { CertificationType, CertificationStatus } from '../dto';

export interface Certification {
  id: string;
  employee_id: string;
  organization_id: string;
  type: CertificationType;
  name: string;
  issuer?: string;
  status: CertificationStatus;
  issue_date: Date;
  expiry_date?: Date;
  certificate_number?: string;
  certificate_url?: string;
  requires_renewal: boolean;
  is_expiring_soon: boolean; // Within 30 days
  days_until_expiry?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
