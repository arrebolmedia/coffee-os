import { IsEnum, IsOptional, IsDateString, IsString } from 'class-validator';
import { ExpenseCategory, ExpenseStatus, ExpensePaymentMethod } from './create-expense.dto';

export class UpdateExpenseDto {
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @IsOptional()
  @IsEnum(ExpensePaymentMethod)
  payment_method?: ExpensePaymentMethod;

  @IsOptional()
  @IsDateString()
  paid_date?: string;

  @IsOptional()
  @IsString()
  payment_reference?: string; // Número de transferencia, cheque, etc.

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  attachment_url?: string;
}
