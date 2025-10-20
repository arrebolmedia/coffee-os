import { IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';

export enum PermitType {
  USO_SUELO = 'USO_SUELO',                    // Uso de suelo
  FUNCIONAMIENTO = 'FUNCIONAMIENTO',          // Licencia de funcionamiento
  PROTECCION_CIVIL = 'PROTECCION_CIVIL',      // Protección civil
  ANUNCIO = 'ANUNCIO',                        // Licencia de anuncio
  SALUBRIDAD = 'SALUBRIDAD',                  // Licencia sanitaria
  BOMBEROS = 'BOMBEROS',                      // Dictamen de bomberos
  ECOLOGIA = 'ECOLOGIA',                      // Licencia ambiental
  ALCOHOL = 'ALCOHOL',                        // Venta de alcohol (si aplica)
  IMSS = 'IMSS',                              // Registro patronal IMSS
  SAT = 'SAT',                                // RFC y obligaciones SAT
  INFONAVIT = 'INFONAVIT',                    // Registro INFONAVIT
  STPS = 'STPS',                              // STPS (Secretaría del Trabajo)
  OTHER = 'OTHER',
}

export enum PermitStatus {
  PENDING = 'PENDING',          // En trámite
  ACTIVE = 'ACTIVE',            // Vigente
  EXPIRED = 'EXPIRED',          // Vencido
  RENEWAL_DUE = 'RENEWAL_DUE',  // Por renovar (< 30 días)
  CANCELLED = 'CANCELLED',      // Cancelado
}

export class CreatePermitDto {
  @IsNotEmpty()
  @IsString()
  organization_id: string;

  @IsNotEmpty()
  @IsString()
  location_id: string; // Sucursal específica

  @IsEnum(PermitType)
  type: PermitType;

  @IsNotEmpty()
  @IsString()
  permit_number: string; // Número de folio

  @IsNotEmpty()
  @IsString()
  issuing_authority: string; // Autoridad emisora (ej: "Alcaldía Cuauhtémoc")

  @IsNotEmpty()
  @IsDateString()
  issue_date: string;

  @IsNotEmpty()
  @IsDateString()
  expiry_date: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number; // Costo del trámite

  @IsOptional()
  @IsString()
  renewal_frequency?: string; // RRULE format: "FREQ=YEARLY;BYMONTH=3"

  @IsOptional()
  @IsString()
  responsible_person?: string; // Responsable del seguimiento

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  document_url?: string; // URL del PDF del permiso
}
