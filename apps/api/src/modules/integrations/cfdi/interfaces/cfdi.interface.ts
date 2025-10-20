import {
  TipoComprobante,
  MetodoPago,
  FormaPago,
  UsoCFDI,
  RegimenFiscal,
} from '../dto/create-cfdi.dto';

export interface CFDIConcepto {
  descripcion: string;
  claveProdServ: string; // Clave del SAT
  claveUnidad: string; // Clave de unidad SAT
  cantidad: number;
  valorUnitario: number;
  importe: number;
  descuento?: number;
  impuestos?: CFDIImpuesto[];
}

export interface CFDIImpuesto {
  tipo: 'traslado' | 'retencion';
  impuesto: string; // 001=ISR, 002=IVA, 003=IEPS
  tipoFactor: string;
  tasaOCuota: number;
  importe: number;
}

export interface CFDIReceptor {
  rfc: string;
  nombre: string;
  domicilioFiscalReceptor?: string;
  regimenFiscalReceptor: RegimenFiscal;
  usoCFDI: UsoCFDI;
}

export interface CFDIEmisor {
  rfc: string;
  nombre: string;
  regimenFiscal: RegimenFiscal;
}

export interface CFDITotales {
  subtotal: number;
  descuento: number;
  totalImpuestosTrasladados: number;
  totalImpuestosRetenidos: number;
  total: number;
}

export interface CFDI {
  id: string;
  organization_id: string;
  location_id: string;
  order_id?: string;

  // CFDI Data
  uuid?: string; // Folio Fiscal (generado por PAC)
  serie?: string;
  folio?: string;
  fecha: Date; // Fecha de emisión
  sello?: string; // Sello digital del CFDI (generado por PAC)
  noCertificado?: string; // Número de certificado del SAT
  certificadoSAT?: string; // Certificado del SAT
  selloSAT?: string; // Sello del SAT
  cadenaOriginalSAT?: string; // Cadena original del complemento de certificación

  tipoDeComprobante: TipoComprobante;
  metodoPago: MetodoPago;
  formaPago: FormaPago;

  emisor: CFDIEmisor;
  receptor: CFDIReceptor;
  conceptos: CFDIConcepto[];
  totales: CFDITotales;

  // Status
  status: 'draft' | 'pending' | 'stamped' | 'cancelled' | 'error';
  errorMessage?: string;

  // PAC Integration
  pacResponse?: any; // Response from PAC provider
  xmlContent?: string; // XML del CFDI timbrado
  pdfUrl?: string; // URL del PDF generado

  // Metadata
  observaciones?: string;
  canceledAt?: Date;
  motivoCancelacion?: string;

  created_at: Date;
  updated_at: Date;
}

export interface CFDIValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface CFDIStampResponse {
  success: boolean;
  uuid?: string;
  xml?: string;
  pdf?: string;
  cadenaOriginal?: string;
  sello?: string;
  noCertificado?: string;
  error?: string;
}

export interface CFDICancelResponse {
  success: boolean;
  uuid: string;
  fechaCancelacion?: Date;
  estatusCancelacion?: string;
  error?: string;
}

export interface CFDIStats {
  totalEmitidos: number;
  totalCancelados: number;
  totalActivos: number;
  montoTotal: number;
  ivaTotal: number;
  subtotal: number;
  porTipoComprobante: {
    [key in TipoComprobante]?: number;
  };
  porFormaPago: {
    [key: string]: number;
  };
}
