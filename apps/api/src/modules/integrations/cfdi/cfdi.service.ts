import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CreateCFDIDto,
  CancelCFDIDto,
  TipoComprobante,
} from './dto';
import {
  CFDI,
  CFDIValidationResult,
  CFDIStampResponse,
  CFDICancelResponse,
  CFDIStats,
  CFDITotales,
} from './interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CFDIService {
  private cfdis: Map<string, CFDI> = new Map();
  
  // PAC Configuration (mock for development)
  private readonly pacConfig = {
    apiUrl: process.env.PAC_API_URL || 'https://api.pac-provider.com',
    apiKey: process.env.PAC_API_KEY || 'mock-api-key',
    rfcEmisor: process.env.RFC_EMISOR || 'XAXX010101000',
    nombreEmisor: process.env.NOMBRE_EMISOR || 'Mi Cafetería S.A. de C.V.',
    regimenFiscal: process.env.REGIMEN_FISCAL || '601',
    lugarExpedicion: process.env.LUGAR_EXPEDICION || '06600', // CDMX
  };

  /**
   * Crear un CFDI (factura electrónica)
   */
  async create(createCFDIDto: CreateCFDIDto): Promise<CFDI> {
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
   * Timbrar CFDI con PAC (Proveedor Autorizado de Certificación)
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

    try {
      // Mock PAC integration - in production, call real PAC API
      const uuid = this.generateUUID();
      const xmlContent = this.generateXML(cfdi, uuid);

      cfdi.uuid = uuid;
      cfdi.status = 'stamped';
      cfdi.xmlContent = xmlContent;
      cfdi.sello = this.generateSello();
      cfdi.noCertificado = '00001000000123456789';
      cfdi.cadenaOriginalSAT = this.generateCadenaOriginal(cfdi);
      cfdi.pdfUrl = `https://storage.example.com/cfdis/${uuid}.pdf`;
      cfdi.updated_at = new Date();

      this.cfdis.set(id, cfdi);

      return {
        success: true,
        uuid: cfdi.uuid,
        xml: cfdi.xmlContent,
        pdf: cfdi.pdfUrl,
        cadenaOriginal: cfdi.cadenaOriginalSAT,
        sello: cfdi.sello,
        noCertificado: cfdi.noCertificado,
      };
    } catch (error) {
      cfdi.status = 'error';
      cfdi.errorMessage = error.message;
      cfdi.updated_at = new Date();
      this.cfdis.set(id, cfdi);

      return {
        success: false,
        uuid: '',
        error: error.message,
      };
    }
  }

  /**
   * Cancelar un CFDI
   */
  async cancel(cancelDto: CancelCFDIDto): Promise<CFDICancelResponse> {
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

    if (cfdi.status !== 'stamped') {
      throw new BadRequestException('Solo se pueden cancelar CFDIs timbrados');
    }

    try {
      // Mock PAC cancellation - in production, call real PAC API
      cfdi.status = 'cancelled';
      cfdi.canceledAt = new Date();
      cfdi.motivoCancelacion = cancelDto.motivoCancelacion;
      cfdi.updated_at = new Date();

      this.cfdis.set(cfdi.id, cfdi);

      return {
        success: true,
        uuid: cfdi.uuid!,
        fechaCancelacion: cfdi.canceledAt,
        estatusCancelacion: 'Cancelado',
      };
    } catch (error) {
      return {
        success: false,
        uuid: cancelDto.uuid,
        error: error.message,
      };
    }
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
   * Descargar XML de un CFDI
   */
  async downloadXML(id: string): Promise<string> {
    const cfdi = await this.findById(id);
    
    if (cfdi.status !== 'stamped') {
      throw new BadRequestException('Solo se puede descargar XML de CFDIs timbrados');
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
      (c) => c.organization_id === organization_id && c.status === 'stamped',
    );

    if (startDate) {
      cfdis = cfdis.filter((c) => c.fecha >= startDate);
    }

    if (endDate) {
      cfdis = cfdis.filter((c) => c.fecha <= endDate);
    }

    const stats: CFDIStats = {
      totalEmitidos: cfdis.filter((c) => c.status === 'stamped').length,
      totalCancelados: cfdis.filter((c) => c.status === 'cancelled').length,
      totalActivos: cfdis.filter((c) => c.status === 'stamped').length,
      montoTotal: cfdis.reduce((sum, c) => sum + c.totales.total, 0),
      ivaTotal: cfdis.reduce(
        (sum, c) => sum + c.totales.totalImpuestosTrasladados,
        0,
      ),
      subtotal: cfdis.reduce((sum, c) => sum + c.totales.subtotal, 0),
      porTipoComprobante: {},
      porFormaPago: {},
    };

    // Agrupar por tipo de comprobante
    cfdis.forEach((cfdi) => {
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
      totalImpuestosRetenidos:
        Math.round(totalImpuestosRetenidos * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  /**
   * Generar UUID para CFDI (mock)
   */
  private generateUUID(): string {
    return `${uuidv4()}`.toUpperCase();
  }

  /**
   * Generar XML del CFDI (mock - in production use proper XML library)
   */
  private generateXML(cfdi: CFDI, uuid: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  Version="4.0"
  Fecha="${cfdi.fecha.toISOString()}"
  Sello="${this.generateSello()}"
  FormaPago="${cfdi.formaPago}"
  NoCertificado="00001000000123456789"
  SubTotal="${cfdi.totales.subtotal}"
  Descuento="${cfdi.totales.descuento}"
  Total="${cfdi.totales.total}"
  TipoDeComprobante="${cfdi.tipoDeComprobante}"
  MetodoPago="${cfdi.metodoPago}"
  LugarExpedicion="${this.pacConfig.lugarExpedicion}">
  <cfdi:Emisor Rfc="${cfdi.emisor.rfc}" Nombre="${cfdi.emisor.nombre}" RegimenFiscal="${cfdi.emisor.regimenFiscal}"/>
  <cfdi:Receptor Rfc="${cfdi.receptor.rfc}" Nombre="${cfdi.receptor.nombre}" UsoCFDI="${cfdi.receptor.usoCFDI}" RegimenFiscalReceptor="${cfdi.receptor.regimenFiscalReceptor}"/>
  <cfdi:Conceptos>
    ${cfdi.conceptos
      .map(
        (c) => `
    <cfdi:Concepto ClaveProdServ="${c.claveProdServ}" Cantidad="${c.cantidad}" ClaveUnidad="${c.claveUnidad}" Descripcion="${c.descripcion}" ValorUnitario="${c.valorUnitario}" Importe="${c.importe}"/>`,
      )
      .join('')}
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      Version="1.1"
      UUID="${uuid}"
      FechaTimbrado="${new Date().toISOString()}"
      SelloCFD="${this.generateSello()}"
      NoCertificadoSAT="00001000000987654321"
      SelloSAT="${this.generateSello()}"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
  }

  /**
   * Generar sello digital (mock)
   */
  private generateSello(): string {
    return Buffer.from(Math.random().toString()).toString('base64').slice(0, 50);
  }

  /**
   * Generar cadena original (mock)
   */
  private generateCadenaOriginal(cfdi: CFDI): string {
    return `||1.1|${cfdi.uuid}|${cfdi.fecha.toISOString()}|${cfdi.sello}|00001000000987654321||`;
  }
}
