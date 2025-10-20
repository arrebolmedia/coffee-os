import { ExpenseCategory, ExpenseStatus, ExpensePaymentMethod } from '../dto';

export interface Expense {
  id: string;
  organization_id: string;
  location_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  tax_amount?: number;
  total_amount: number; // amount + tax_amount
  
  due_date?: Date;
  status: ExpenseStatus;
  
  // Vendor info
  vendor_name?: string;
  vendor_rfc?: string;
  invoice_number?: string;
  
  // Payment info
  payment_method?: ExpensePaymentMethod;
  paid_date?: Date;
  payment_reference?: string;
  
  // Attachments
  attachment_url?: string;
  
  notes?: string;
  
  created_by_user_id?: string;
  created_at: Date;
  updated_at: Date;
}
