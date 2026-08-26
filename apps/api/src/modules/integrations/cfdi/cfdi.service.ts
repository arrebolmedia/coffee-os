import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Lee una variable de entorno sin defaults. Ausente o vacía => cadena vacía,
 * que este servicio interpreta como "no configurado" (modo mock bloqueado).
 */
function optionalEnv(name: string): string {
  return (process.env[name] ?? '').trim();
}

/**
 * Mensajes de bloqueo. Son deliberadamente explícitos: cualquier consumidor
 * (POS, cliente, contador) debe entender que NO existe comprobante fiscal.
 */
const PAC_NOT_CONFIGURED_MESSAGE =
  'No hay PAC (Proveedor Autorizado de Certificación) configurado. ' +
  'Este sistema NO puede timbrar ante el SAT: no se generó ningún ' +
  'comprobante fiscal y nada de lo emitido aquí tiene validez fiscal. ' +
  'Configura PAC_API_URL y PAC_API_KEY con un PAC real para habilitar el timbrado.';

const PAC_CLIENT_NOT_IMPLEMENTED_MESSAGE =
  'Hay credenciales de PAC configuradas (PAC_API_URL/PAC_API_KEY) pero el ' +
  'cliente de timbrado real todavía no está implementado. No se envió nada al ' +
  'SAT y no se emitió ningún comprobante con validez fiscal.';

import { CancelCFDIDto, CreateCFDIDto } from './dto';
import {
  CFDI,
  CFDICancelResponse,
  CFDIStampResponse,
  CFDIStats,
  CFDITotales,
  CFDIValidationResult,
} from './interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CFDIService {
  private readonly logger = new Logger(CFDIService.name);
  private cfdis: Map<string, CFDI> = new Map();

  // PAC Configuration — credentials must come from environment, no defaults.
  private readonly pacConfig = {
    apiUrl: optionalEnv('PAC_API_URL'),
    apiKey: optionalEnv('PAC_API_KEY'),
    rfcEmisor: optionalEnv('RFC_EMISOR'),
    nombreEmisor: optionalEnv('NOMBRE_EMISOR'),
    regimenFiscal: optionalEnv('REGIMEN_FISCAL'),
    lugarExpedicion: optionalEnv('LUGAR_EXPEDICION'),
  };

  /**
   * ¿Hay credenciales de PAC? Estar configurado NO implica que se haya
   * timbrado algo: el timbrado real solo lo confirma la respuesta del PAC.
   */
  isPacConfigured(): boolean {
    return this.pacConfig.apiUrl !== '' && this.pacConfig.apiKey !== '';
  }

  /**
   * Crear un CFDI (factura electrónica) en borrador.
   *
   * Crear un borrador es seguro (no se declara nada ante el SAT), pero sin
   * PAC ese borrador jamás podrá timbrarse.
   */
  async create(createCFDIDto: CreateCFDIDto): Promise<CFDI> {
    if (!this.isPacConfigured()) {
      this.logger.warn(
        'Creando CFDI en borrador sin PAC configurado: no podrá timbrarse ni ' +
          'descargarse como factura.',
      );
    }

    // Validar datos
    const validation = this.validateCFDI(createCFDIDto);
    if (!validation.valid) {
      throw new BadRequestException(
        `CFDI inválido: ${validation.errors.join(', ')}`,
      );
    }

    // Calcular totales
    const totales = this.calculateTotales(createCFDIDto.conceptos);

    // Crear CFDI
    const cfdi: CFDI = {
      id: uuidv4(),
      organization_id: createCFDIDto.organization_id,
      location_id: createCFDIDto.location_id,
      order_id: createCFDIDto.order_id,
      fecha: new Date(),
      tipoDeComprobante: createCFDIDto.tipoDeComprobante,
      metodoPago: createCFDIDto.metodoPago,
      formaPago: createCFDIDto.formaPago,
      emisor: {
        rfc: this.pacConfig.rfcEmisor,
        nombre: this.pacConfig.nombreEmisor,
        regimenFiscal: this.pacConfig.regimenFiscal as any,
      },
      receptor: createCFDIDto.receptor,
      conceptos: createCFDIDto.conceptos,
      totales,
      status: 'draft',
      observaciones: createCFDIDto.observaciones,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.cfdis.set(cfdi.id, cfdi);

    return cfdi;
  }

  /**
   * Timbrar CFDI con PAC (Proveedor Autorizado de Certificación).
   *
   * NUNCA finge un timbre. Sin PAC configurado el CFDI queda marcado como
   * 'mock' (sin UUID, sin sello, sin XML) y la operación falla con 503.
   */
  async stampCFDI(id: string): Promise<CFDIStampResponse> {
    const cfdi = this.cfdis.get(id);
    if (!cfdi) {
      throw new NotFoundException(`CFDI ${id} no encontrado`);
    }

    if (cfdi.status === 'stamped') {
      throw new BadRequestException('CFDI ya está timbrado');
    }

    if (cfdi.status === 'cancelled') {
      throw new BadRequestException('CFDI cancelado no puede ser timbrado');
    }

    if (!this.isPacConfigured()) {
      // Modo mock: se marca el comprobante de forma inconfundible y se
      // limpia cualquier dato fiscal para que no pueda pasar por timbrado.
      cfdi.status = 'mock';
      cfdi.errorMessage = PAC_NOT_CONFIGURED_MESSAGE;
      cfdi.uuid = undefined;
      cfdi.sello = undefined;
      cfdi.noCertificado = undefined;
      cfdi.certificadoSAT = undefined;
      cfdi.selloSAT = undefined;
      cfdi.cadenaOriginalSAT = undefined;
      cfdi.xmlContent = undefined;
      cfdi.pdfUrl = undefined;
      cfdi.updated_at = new Date();
      this.cfdis.set(id, cfdi);

      this.logger.error(
        `CFDI ${id}: timbrado bloqueado, no hay PAC configurado. ` +
          'No se emitió ningún comprobante ante el SAT.',
      );

      throw new ServiceUnavailableException(PAC_NOT_CONFIGURED_MESSAGE);
    }

    return this.stampWithPac(cfdi);
  }

  /**
   * Timbrado real contra el PAC. Pendiente de implementar.
   *
   * Aquí va la llamada HTTP a `this.pacConfig.apiUrl` autenticada con
   * `this.pacConfig.apiKey`, firmando el comprobante con el CSD del emisor.
   * El PAC es quien devuelve UUID, SelloCFD, SelloSAT, NoCertificadoSAT,
   * cadena original y el XML timbrado: SOLO con esa respuesta puede el CFDI
   * pasar a `status = 'stamped'`. Mientras no exista ese cliente, esta ruta
   * falla en vez de fingir éxito.
   */
  private async stampWithPac(cfdi: CFDI): Promise<CFDIStampResponse> {
    cfdi.status = 'error';
    cfdi.errorMessage = PAC_CLIENT_NOT_IMPLEMENTED_MESSAGE;
    cfdi.updated_at = new Date();
    this.cfdis.set(cfdi.id, cfdi);

    this.logger.error(`CFDI ${cfdi.id}: ${PAC_CLIENT_NOT_IMPLEMENTED_MESSAGE}`);

    throw new NotImplementedException(PAC_CLIENT_NOT_IMPLEMENTED_MESSAGE);
  }

  /**
   * Cancelar un CFDI ante el SAT.
   *
   * Sin PAC no existe cancelación posible: marcar el registro como
   * 'cancelled' localmente sería mentir sobre el estado ante el SAT.
   */
  async cancel(cancelDto: CancelCFDIDto): Promise<CFDICancelResponse> {
    if (!this.isPacConfigured()) {
      this.logger.error(
        `Cancelación bloqueada para UUID ${cancelDto.uuid}: no hay PAC configurado.`,
      );
      throw new ServiceUnavailableException(
        'No se puede cancelar ante el SAT: ' + PAC_NOT_CONFIGURED_MESSAGE,
      );
    }

    const cfdi = Array.from(this.cfdis.values()).find(
      (c) =>
        c.uuid === cancelDto.uuid &&
        c.organization_id === cancelDto.organization_id,
    );

    if (!cfdi) {
      throw new NotFoundException(
        `CFDI con UUID ${cancelDto.uuid} no encontrado`,
      );
    }

    if (cfdi.status === 'mock') {
      throw new BadRequestException(
        'Este CFDI nunca fue timbrado (status "mock"): no existe ante el SAT, ' +
          'por lo que no hay nada que cancelar.',
      );
    }

    if (cfdi.status !== 'stamped') {
      throw new BadRequestException('Solo se pueden cancelar CFDIs timbrados');
    }

    return this.cancelWithPac(cfdi, cancelDto);
  }

  /**
   * Cancelación real contra el PAC. Pendiente de implementar.
   *
   * Debe enviar la solicitud de cancelación con el motivo (y el folio
   * sustituto si aplica) y solo marcar `status = 'cancelled'` cuando el SAT
   * confirme el acuse. No se simula.
   */
  private async cancelWithPac(
    cfdi: CFDI,
    cancelDto: CancelCFDIDto,
  ): Promise<CFDICancelResponse> {
    this.logger.error(
      `CFDI ${cfdi.id} (UUID ${cancelDto.uuid}): ${PAC_CLIENT_NOT_IMPLEMENTED_MESSAGE}`,
    );

    throw new NotImplementedException(
      'Cancelación ante el SAT no disponible: ' +
        PAC_CLIENT_NOT_IMPLEMENTED_MESSAGE,
    );
  }

  /**
   * Obtener un CFDI por ID
   */
  async findById(id: string): Promise<CFDI> {
    const cfdi = this.cfdis.get(id);
    if (!cfdi) {
      throw new NotFoundException(`CFDI ${id} no encontrado`);
    }
    return cfdi;
  }

  /**
   * Obtener CFDI por UUID (folio fiscal)
   */
  async findByUUID(uuid: string): Promise<CFDI> {
    const cfdi = Array.from(this.cfdis.values()).find((c) => c.uuid === uuid);
    if (!cfdi) {
      throw new NotFoundException(`CFDI con UUID ${uuid} no encontrado`);
    }
    return cfdi;
  }

  /**
   * Listar CFDIs de una organización
   */
  async findAll(
    organization_id: string,
    filters?: {
      location_id?: string;
      status?: CFDI['status'];
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<CFDI[]> {
    let cfdis = Array.from(this.cfdis.values()).filter(
      (c) => c.organization_id === organization_id,
    );

    if (filters?.location_id) {
      cfdis = cfdis.filter((c) => c.location_id === filters.location_id);
    }

    if (filters?.status) {
      cfdis = cfdis.filter((c) => c.status === filters.status);
    }

    if (filters?.startDate) {
      cfdis = cfdis.filter((c) => c.fecha >= filters.startDate!);
    }

    if (filters?.endDate) {
      cfdis = cfdis.filter((c) => c.fecha <= filters.endDate!);
    }

    return cfdis.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  /**
   * Descargar XML de un CFDI.
   *
   * Solo se entrega XML timbrado por un PAC real. Un XML sin timbre válido
   * entregado como factura es riesgo fiscal, así que se bloquea.
   */
  async downloadXML(id: string): Promise<string> {
    const cfdi = await this.findById(id);

    if (cfdi.status === 'mock') {
      throw new ServiceUnavailableException(
        'Este CFDI es una simulación (status "mock"): no tiene UUID, sello ni ' +
          'Timbre Fiscal Digital, no existe ante el SAT y no se puede ' +
          'descargar como factura. ' +
          PAC_NOT_CONFIGURED_MESSAGE,
      );
    }

    if (!this.isPacConfigured()) {
      throw new ServiceUnavailableException(
        'Descarga de XML bloqueada. ' + PAC_NOT_CONFIGURED_MESSAGE,
      );
    }

    if (cfdi.status !== 'stamped') {
      throw new BadRequestException(
        'Solo se puede descargar XML de CFDIs timbrados',
      );
    }

    if (!cfdi.xmlContent) {
      throw new NotFoundException('XML no disponible');
    }

    return cfdi.xmlContent;
  }

  /**
   * Obtener estadísticas de CFDIs
   */
  async getStats(
    organization_id: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CFDIStats> {
    let cfdis = Array.from(this.cfdis.values()).filter(
      (c) => c.organization_id === organization_id,
    );

    if (startDate) {
      cfdis = cfdis.filter((c) => c.fecha >= startDate);
    }

    if (endDate) {
      cfdis = cfdis.filter((c) => c.fecha <= endDate);
    }

    // Solo cuenta como emitido lo timbrado por un PAC real. Los 'mock' se
    // reportan aparte para que su volumen sea visible y no se confunda con
    // facturación real.
    const stamped = cfdis.filter((c) => c.status === 'stamped');
    const cancelled = cfdis.filter((c) => c.status === 'cancelled');
    const mock = cfdis.filter((c) => c.status === 'mock');

    const stats: CFDIStats = {
      totalEmitidos: stamped.length,
      totalCancelados: cancelled.length,
      totalActivos: stamped.length,
      totalMock: mock.length,
      montoTotal: stamped.reduce((sum, c) => sum + c.totales.total, 0),
      ivaTotal: stamped.reduce(
        (sum, c) => sum + c.totales.totalImpuestosTrasladados,
        0,
      ),
      subtotal: stamped.reduce((sum, c) => sum + c.totales.subtotal, 0),
      porTipoComprobante: {},
      porFormaPago: {},
    };

    // Agrupar por tipo de comprobante
    stamped.forEach((cfdi) => {
      stats.porTipoComprobante[cfdi.tipoDeComprobante] =
        (stats.porTipoComprobante[cfdi.tipoDeComprobante] || 0) + 1;

      stats.porFormaPago[cfdi.formaPago] =
        (stats.porFormaPago[cfdi.formaPago] || 0) + 1;
    });

    return stats;
  }

  /**
   * Validar RFC mexicano
   */
  validateRFC(rfc: string): boolean {
    const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;
    return rfcPattern.test(rfc);
  }

  /**
   * Validar estructura del CFDI
   */
  private validateCFDI(dto: CreateCFDIDto): CFDIValidationResult {
    const errors: string[] = [];

    // Validar RFC del receptor
    if (!this.validateRFC(dto.receptor.rfc)) {
      errors.push('RFC del receptor inválido');
    }

    // Validar que haya conceptos
    if (!dto.conceptos || dto.conceptos.length === 0) {
      errors.push('Debe incluir al menos un concepto');
    }

    // Validar conceptos
    dto.conceptos.forEach((concepto, index) => {
      if (concepto.cantidad <= 0) {
        errors.push(`Concepto ${index + 1}: cantidad debe ser mayor a 0`);
      }

      if (concepto.valorUnitario < 0) {
        errors.push(
          `Concepto ${index + 1}: valor unitario debe ser mayor o igual a 0`,
        );
      }

      const importeCalculado = concepto.cantidad * concepto.valorUnitario;
      if (Math.abs(concepto.importe - importeCalculado) > 0.01) {
        errors.push(
          `Concepto ${index + 1}: importe no coincide con cantidad * valorUnitario`,
        );
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calcular totales del CFDI
   */
  private calculateTotales(conceptos: any[]): CFDITotales {
    let subtotal = 0;
    let descuento = 0;
    let totalImpuestosTrasladados = 0;
    let totalImpuestosRetenidos = 0;

    conceptos.forEach((concepto) => {
      subtotal += concepto.importe;
      descuento += concepto.descuento || 0;

      if (concepto.impuestos) {
        concepto.impuestos.forEach((impuesto: any) => {
          if (impuesto.tipo === 'traslado') {
            totalImpuestosTrasladados += impuesto.importe;
          } else if (impuesto.tipo === 'retencion') {
            totalImpuestosRetenidos += impuesto.importe;
          }
        });
      }
    });

    const total =
      subtotal -
      descuento +
      totalImpuestosTrasladados -
      totalImpuestosRetenidos;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      descuento: Math.round(descuento * 100) / 100,
      totalImpuestosTrasladados:
        Math.round(totalImpuestosTrasladados * 100) / 100,
      totalImpuestosRetenidos: Math.round(totalImpuestosRetenidos * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  // NOTA: aquí vivían generateUUID/generateXML/generateSello/
  // generateCadenaOriginal, que fabricaban un TimbreFiscalDigital falso
  // (UUID inventado, SelloCFD/SelloSAT con Math.random y NoCertificadoSAT
  // literal '00001000000987654321') y lo entregaban como factura válida.
  // Se eliminaron: el UUID, los sellos, el número de certificado y el XML
  // timbrado los emite EXCLUSIVAMENTE el PAC. Cuando se implemente
  // `stampWithPac`, esos valores llegan en la respuesta del PAC y se guardan
  // tal cual; este servicio no debe generarlos nunca.
}
