import { EmployeeStatus, EmploymentType, EmployeeRole } from '../dto';

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  organization_id: string;
  location_id: string;
  role: EmployeeRole;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  hire_date: Date;
  termination_date?: Date;
  termination_reason?: string;
  hourly_rate?: number;
  monthly_salary?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  rfc?: string;
  curp?: string;
  nss?: string;
  created_at: Date;
  updated_at: Date;
}
