import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export enum MotivoCancelacion {
  COMPROBANTE_EMITIDO_CON_ERRORES = '01',
  COMPROBANTE_EMITIDO_CON_ERRORES_RELACION = '02',
  NO_SE_LLEVO_CABO_OPERACION = '03',
  OPERACION_NOMINATIVA_RELACIONADA = '04',
}

export class CancelCFDIDto {
  @IsNotEmpty()
  @IsString()
  uuid: string; // UUID del CFDI a cancelar (folio fiscal)

  @IsNotEmpty()
  @IsString()
  organization_id: string;

  @IsNotEmpty()
  @IsEnum(MotivoCancelacion)
  motivoCancelacion: MotivoCancelacion;

  @IsNotEmpty()
  @IsString()
  rfc: string; // RFC del emisor
}
