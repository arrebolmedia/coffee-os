import { IsNotEmpty, IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export enum ExpenseCategory {
  RENT = 'RENT',                    // Renta
  UTILITIES = 'UTILITIES',          // Servicios (luz, agua, gas)
  LABOR = 'LABOR',                  // Nómina y prestaciones
  SUPPLIES = 'SUPPLIES',            // Insumos operativos
  MARKETING = 'MARKETING',          // Marketing y publicidad
  EQUIPMENT = 'EQUIPMENT',          // Equipo y mantenimiento
  INSURANCE = 'INSURANCE',          // Seguros
  TAXES = 'TAXES',                  // Impuestos (IVA, ISR, predial)
  PROFESSIONAL_SERVICES = 'PROFESSIONAL_SERVICES', // Contadores, abogados
  PERMITS_LICENSES = 'PERMITS_LICENSES', // Permisos y licencias
  WASTE_MANAGEMENT = 'WASTE_MANAGEMENT', // Manejo de residuos
  SECURITY = 'SECURITY',            // Seguridad
  OTHER = 'OTHER',                  // Otros
}

export enum ExpenseStatus {
  PENDING = 'PENDING',        // Pendiente de pago
  PAID = 'PAID',              // Pagado
  OVERDUE = 'OVERDUE',        // Vencido
  CANCELLED = 'CANCELLED',    // Cancelado
}

export enum ExpensePaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CHECK = 'CHECK',
  CARD = 'CARD',
  CREDIT = 'CREDIT',
}

export class CreateExpenseDto {
  @IsNotEmpty()
  @IsString()
  organization_id: string;

  @IsNotEmpty()
  @IsString()
  location_id: string; // Sucursal específica

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax_amount?: number; // IVA

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsString()
  vendor_name?: string; // Proveedor

  @IsOptional()
  @IsString()
  vendor_rfc?: string; // RFC del proveedor

  @IsOptional()
  @IsString()
  invoice_number?: string; // Número de factura

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  attachment_url?: string; // URL del comprobante (PDF, imagen)
}
