import { PermitType, PermitStatus } from '../dto';

export interface Permit {
  id: string;
  organization_id: string;
  location_id: string;
  type: PermitType;
  permit_number: string;
  issuing_authority: string;
  
  issue_date: Date;
  expiry_date: Date;
  status: PermitStatus;
  
  cost?: number;
  renewal_frequency?: string; // RRULE format
  next_renewal_date?: Date;
  last_renewal_date?: Date;
  renewal_cost?: number;
  
  responsible_person?: string;
  notes?: string;
  document_url?: string;
  
  // Alert tracking
  days_until_expiry?: number;
  is_expiring_soon?: boolean; // < 30 days
  
  created_at: Date;
  updated_at: Date;
}
