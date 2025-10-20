import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// CFDI 4.0 Enums
export enum TipoComprobante {
  INGRESO = 'I', // Factura de ingreso
  EGRESO = 'E', // Nota de crédito
  TRASLADO = 'T', // Carta porte
  NOMINA = 'N', // Recibo de nómina
  PAGO = 'P', // Recibo de pago
}

export enum MetodoPago {
  PUE = 'PUE', // Pago en una sola exhibición
  PPD = 'PPD', // Pago en parcialidades o diferido
}

export enum FormaPago {
  EFECTIVO = '01',
  CHEQUE = '02',
  TRANSFERENCIA = '03',
  TARJETA_CREDITO = '04',
  MONEDERO_ELECTRONICO = '05',
  DINERO_ELECTRONICO = '06',
  VALES_DESPENSA = '08',
  DACION_EN_PAGO = '12',
  PAGO_POR_SUBROGACION = '13',
  PAGO_POR_CONSIGNACION = '14',
  CONDONACION = '15',
  COMPENSACION = '17',
  NOVACION = '23',
  CONFUSION = '24',
  REMISION_DEUDA = '25',
  PRESCRIPCION = '26',
  SATISFACCION_ACREEDOR = '27',
  TARJETA_DEBITO = '28',
  TARJETA_SERVICIOS = '29',
  POR_DEFINIR = '99',
}

export enum UsoCFDI {
  ADQUISICION_MERCANCIAS = 'G01',
  DEVOLUCIONES = 'G02',
  GASTOS_GENERALES = 'G03',
  CONSTRUCCIONES = 'I01',
  MOBILIARIO_EQUIPO_INVERSION = 'I02',
  EQUIPO_TRANSPORTE = 'I03',
  EQUIPO_COMPUTO = 'I04',
  DADOS_TROQUELES_MOLDES = 'I05',
  COMUNICACIONES_TELEFONICAS = 'I06',
  COMUNICACIONES_SATELITALES = 'I07',
  OTRA_MAQUINARIA = 'I08',
  HONORARIOS_MEDICOS = 'D01',
  GASTOS_MEDICOS = 'D02',
  GASTOS_FUNERALES = 'D03',
  DONATIVOS = 'D04',
  INTERESES_HIPOTECARIOS = 'D05',
  APORTACIONES_VOLUNTARIAS_SAR = 'D06',
  PRIMAS_SEGUROS_GASTOS_MEDICOS = 'D07',
  GASTOS_TRANSPORTE_ESCOLAR = 'D08',
  DEPOSITOS_CUENTAS_AHORRO = 'D09',
  PAGOS_SERVICIOS_EDUCATIVOS = 'D10',
  SIN_EFECTOS_FISCALES = 'S01',
  PUBLICO_GENERAL = 'P01',
}

export enum RegimenFiscal {
  GENERAL_LEY_PM = '601', // General de Ley Personas Morales
  PM_FINES_NO_LUCRATIVOS = '603', // Personas Morales con Fines no Lucrativos
  SUELDOS_SALARIOS = '605', // Sueldos y Salarios e Ingresos Asimilados a Salarios
  ARRENDAMIENTO = '606', // Arrendamiento
  RIF = '607', // Régimen de Enajenación o Adquisición de Bienes
  DEMAS_INGRESOS = '608', // Demás ingresos
  CONSOLIDACION = '609', // Consolidación
  RESIDENTES_EXTRANJERO = '610', // Residentes en el Extranjero sin Establecimiento Permanente en México
  INGRESOS_DIVIDENDOS = '611', // Ingresos por Dividendos (socios y accionistas)
  PF_ACTIVIDADES_EMPRESARIALES = '612', // Personas Físicas con Actividades Empresariales y Profesionales
  INGRESOS_INTERESES = '614', // Ingresos por intereses
  REGIMEN_OPCIONAL_GRUPOS_SOCIEDADES = '615', // Régimen Opcional para Grupos de Sociedades
  SIN_OBLIGACIONES_FISCALES = '616', // Sin obligaciones fiscales
  INCORPORACION_FISCAL = '621', // Incorporación Fiscal
  ACTIVIDADES_AGRICOLAS = '622', // Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras
  OPCIONAL_GRUPOS = '623', // Opcional para Grupos de Sociedades
  COORDINADOS = '624', // Coordinados
  REGIMEN_ACTIVIDADES_EMPRESARIALES_RESICO = '625', // Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas
  REGIMEN_SIMPLIFICADO_CONFIANZA = '626', // Régimen Simplificado de Confianza
}

export class ConceptoDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  descripcion: string; // Descripción del producto/servicio

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{8}$/)
  claveProdServ: string; // Clave del SAT (8 dígitos)

  @IsNotEmpty()
  @IsString()
  @Length(1, 20)
  claveUnidad: string; // Clave de unidad SAT

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  valorUnitario: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  importe: number; // cantidad * valorUnitario

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImpuestoDto)
  impuestos?: ImpuestoDto[];
}

export class ImpuestoDto {
  @IsNotEmpty()
  @IsString()
  tipo: 'traslado' | 'retencion'; // Traslado (IVA) o Retención (ISR)

  @IsNotEmpty()
  @IsString()
  @Length(3, 3)
  impuesto: string; // 001 = ISR, 002 = IVA, 003 = IEPS

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{6}$/)
  tipoFactor: string; // Tasa, Cuota, Exento

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(1)
  tasaOCuota: number; // 0.16 para IVA, 0.10 para ISR retenido

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  importe: number;
}

export class ReceptorDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/)
  rfc: string; // RFC del receptor

  @IsNotEmpty()
  @IsString()
  @Length(1, 254)
  nombre: string; // Nombre o razón social

  @IsOptional()
  @IsString()
  domicilioFiscalReceptor?: string; // Código postal

  @IsNotEmpty()
  @IsEnum(RegimenFiscal)
  regimenFiscalReceptor: RegimenFiscal;

  @IsNotEmpty()
  @IsEnum(UsoCFDI)
  usoCFDI: UsoCFDI;
}

export class CreateCFDIDto {
  @IsNotEmpty()
  @IsString()
  organization_id: string;

  @IsNotEmpty()
  @IsString()
  location_id: string;

  @IsOptional()
  @IsString()
  order_id?: string; // Reference to order

  @IsNotEmpty()
  @IsEnum(TipoComprobante)
  tipoDeComprobante: TipoComprobante;

  @IsNotEmpty()
  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsNotEmpty()
  @IsEnum(FormaPago)
  formaPago: FormaPago;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ReceptorDto)
  receptor: ReceptorDto;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConceptoDto)
  conceptos: ConceptoDto[];

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  observaciones?: string;
}
