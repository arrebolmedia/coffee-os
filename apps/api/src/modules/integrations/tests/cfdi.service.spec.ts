import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CFDIService } from '../cfdi/cfdi.service';
import {
  CancelCFDIDto,
  CreateCFDIDto,
  FormaPago,
  MetodoPago,
  MotivoCancelacion,
  RegimenFiscal,
  TipoComprobante,
  UsoCFDI,
} from '../cfdi/dto';

/**
 * El módulo CFDI NO tiene integración con un PAC real. Antes fabricaba un
 * Timbre Fiscal Digital falso (UUID inventado, sellos con Math.random,
 * NoCertificadoSAT literal) y marcaba el comprobante como 'stamped'.
 *
 * Estas pruebas fijan el comportamiento correcto: nada se timbra, nada se
 * cancela ante el SAT y no se entrega ningún XML como factura.
 */

const PAC_ENV_KEYS = [
  'PAC_API_URL',
  'PAC_API_KEY',
  'RFC_EMISOR',
  'NOMBRE_EMISOR',
  'REGIMEN_FISCAL',
  'LUGAR_EXPEDICION',
] as const;

const createValidCFDIDto = (): CreateCFDIDto => ({
  organization_id: 'org-123',
  location_id: 'loc-456',
  order_id: 'order-789',
  tipoDeComprobante: TipoComprobante.INGRESO,
  metodoPago: MetodoPago.PUE,
  formaPago: FormaPago.EFECTIVO,
  receptor: {
    rfc: 'XAXX010101000',
    nombre: 'Juan Pérez',
    domicilioFiscalReceptor: '06600',
    regimenFiscalReceptor: RegimenFiscal.GENERAL_LEY_PM,
    usoCFDI: UsoCFDI.GASTOS_GENERALES,
  },
  conceptos: [
    {
      descripcion: 'Café Americano',
      claveProdServ: '50202306',
      claveUnidad: 'H87',
      cantidad: 2,
      valorUnitario: 45.0,
      importe: 90.0,
      impuestos: [
        {
          tipo: 'traslado',
          impuesto: '002',
          tipoFactor: 'Tasa',
          tasaOCuota: 0.16,
          importe: 14.4,
        },
      ],
    },
  ],
  observaciones: 'Factura de ejemplo',
});

async function buildService(): Promise<CFDIService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [CFDIService],
  }).compile();

  return module.get<CFDIService>(CFDIService);
}

describe('CFDIService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key of PAC_ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  // ---------------------------------------------------------------------
  // Sin PAC configurado: modo mock, todo lo fiscal bloqueado
  // ---------------------------------------------------------------------
  describe('sin PAC configurado (modo mock bloqueado)', () => {
    let service: CFDIService;

    beforeEach(async () => {
      for (const key of PAC_ENV_KEYS) {
        delete process.env[key];
      }
      service = await buildService();
    });

    it('should be defined y reportar que no hay PAC', () => {
      expect(service).toBeDefined();
      expect(service.isPacConfigured()).toBe(false);
    });

    describe('create', () => {
      it('crea el CFDI en borrador (no declara nada ante el SAT)', async () => {
        const cfdi = await service.create(createValidCFDIDto());

        expect(cfdi.id).toBeDefined();
        expect(cfdi.organization_id).toBe('org-123');
        expect(cfdi.status).toBe('draft');
        expect(cfdi.uuid).toBeUndefined();
        expect(cfdi.totales.subtotal).toBe(90);
        expect(cfdi.totales.totalImpuestosTrasladados).toBe(14.4);
        expect(cfdi.totales.total).toBe(104.4);
      });

      it('rechaza CFDI con RFC inválido', async () => {
        const dto = createValidCFDIDto();
        dto.receptor.rfc = 'INVALID';

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      });

      it('rechaza CFDI sin conceptos', async () => {
        const dto = createValidCFDIDto();
        dto.conceptos = [];

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      });

      it('calcula totales con descuento', async () => {
        const dto = createValidCFDIDto();
        dto.conceptos[0].descuento = 10;

        const cfdi = await service.create(dto);

        expect(cfdi.totales.subtotal).toBe(90);
        expect(cfdi.totales.descuento).toBe(10);
        expect(cfdi.totales.total).toBe(94.4); // 90 - 10 + 14.4
      });
    });

    describe('stampCFDI', () => {
      it('NO timbra: lanza 503 y deja el CFDI en estado "mock"', async () => {
        const cfdi = await service.create(createValidCFDIDto());

        await expect(service.stampCFDI(cfdi.id)).rejects.toThrow(
          ServiceUnavailableException,
        );
        await expect(service.stampCFDI(cfdi.id)).rejects.toThrow(/PAC/);

        const after = await service.findById(cfdi.id);
        expect(after.status).toBe('mock');
        expect(after.status).not.toBe('stamped');
        expect(after.errorMessage).toMatch(/PAC/);
      });

      it('no fabrica UUID, sello, certificado, XML ni PDF', async () => {
        const cfdi = await service.create(createValidCFDIDto());

        await expect(service.stampCFDI(cfdi.id)).rejects.toThrow(
          ServiceUnavailableException,
        );

        const after = await service.findById(cfdi.id);
        expect(after.uuid).toBeUndefined();
        expect(after.sello).toBeUndefined();
        expect(after.noCertificado).toBeUndefined();
        expect(after.selloSAT).toBeUndefined();
        expect(after.cadenaOriginalSAT).toBeUndefined();
        expect(after.xmlContent).toBeUndefined();
        expect(after.pdfUrl).toBeUndefined();
      });

      it('sigue bloqueado en reintentos (nunca pasa a "stamped")', async () => {
        const cfdi = await service.create(createValidCFDIDto());

        await expect(service.stampCFDI(cfdi.id)).rejects.toThrow(
          ServiceUnavailableException,
        );
        await expect(service.stampCFDI(cfdi.id)).rejects.toThrow(
          ServiceUnavailableException,
        );

        expect((await service.findById(cfdi.id)).status).toBe('mock');
      });

      it('rechaza timbrar un CFDI inexistente', async () => {
        await expect(service.stampCFDI('non-existent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('cancel', () => {
      it('NO cancela ante el SAT: lanza 503', async () => {
        const cancelDto: CancelCFDIDto = {
          uuid: 'cualquier-uuid',
          organization_id: 'org-123',
          motivoCancelacion: MotivoCancelacion.COMPROBANTE_EMITIDO_CON_ERRORES,
          rfc: 'XAXX010101000',
        };

        await expect(service.cancel(cancelDto)).rejects.toThrow(
          ServiceUnavailableException,
        );
        await expect(service.cancel(cancelDto)).rejects.toThrow(/PAC/);
      });

      it('un CFDI mock nunca queda como "cancelled"', async () => {
        const cfdi = await service.create(createValidCFDIDto());
        await expect(service.stampCFDI(cfdi.id)).rejects.toThrow();

        const cancelDto: CancelCFDIDto = {
          uuid: 'cualquier-uuid',
          organization_id: 'org-123',
          motivoCancelacion: MotivoCancelacion.COMPROBANTE_EMITIDO_CON_ERRORES,
          rfc: 'XAXX010101000',
        };

        await expect(service.cancel(cancelDto)).rejects.toThrow();
        expect((await service.findById(cfdi.id)).status).toBe('mock');
      });
    });

    describe('downloadXML', () => {
      it('bloquea la descarga de un CFDI mock con 503', async () => {
        const cfdi = await service.create(createValidCFDIDto());
        await expect(service.stampCFDI(cfdi.id)).rejects.toThrow();

        await expect(service.downloadXML(cfdi.id)).rejects.toThrow(
          ServiceUnavailableException,
        );
        await expect(service.downloadXML(cfdi.id)).rejects.toThrow(
          /no existe ante el SAT/,
        );
      });

      it('bloquea la descarga de un borrador con 503', async () => {
        const cfdi = await service.create(createValidCFDIDto());

        await expect(service.downloadXML(cfdi.id)).rejects.toThrow(
          ServiceUnavailableException,
        );
      });

      it('nunca entrega un XML con TimbreFiscalDigital falso', async () => {
        const cfdi = await service.create(createValidCFDIDto());
        await expect(service.stampCFDI(cfdi.id)).rejects.toThrow();

        await expect(service.downloadXML(cfdi.id)).rejects.toThrow();
        expect((await service.findById(cfdi.id)).xmlContent).toBeUndefined();
      });

      it('lanza NotFound para un CFDI inexistente', async () => {
        await expect(service.downloadXML('non-existent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('findById / findByUUID / findAll', () => {
      it('encuentra un CFDI por ID', async () => {
        const created = await service.create(createValidCFDIDto());

        expect((await service.findById(created.id)).id).toBe(created.id);
      });

      it('lanza NotFoundException para un ID inexistente', async () => {
        await expect(service.findById('non-existent')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('no hay CFDIs con UUID porque ninguno se timbró', async () => {
        const cfdi = await service.create(createValidCFDIDto());
        await expect(service.stampCFDI(cfdi.id)).rejects.toThrow();

        await expect(service.findByUUID('non-existent-uuid')).rejects.toThrow(
          NotFoundException,
        );

        const cfdis = await service.findAll('org-123');
        expect(cfdis.every((c) => c.uuid === undefined)).toBe(true);
      });

      it('filtra por location', async () => {
        const dto1 = createValidCFDIDto();
        dto1.location_id = 'loc-111';
        const dto2 = createValidCFDIDto();
        dto2.location_id = 'loc-222';

        await service.create(dto1);
        await service.create(dto2);

        const cfdis = await service.findAll('org-123', {
          location_id: 'loc-111',
        });

        expect(cfdis.length).toBe(1);
        expect(cfdis.every((c) => c.location_id === 'loc-111')).toBe(true);
      });

      it('permite filtrar por el estado "mock" y no devuelve "stamped"', async () => {
        const cfdi = await service.create(createValidCFDIDto());
        await expect(service.stampCFDI(cfdi.id)).rejects.toThrow();

        const mocks = await service.findAll('org-123', { status: 'mock' });
        expect(mocks.length).toBe(1);

        const stamped = await service.findAll('org-123', { status: 'stamped' });
        expect(stamped.length).toBe(0);
      });
    });

    describe('getStats', () => {
      it('no cuenta los mock como emitidos y los reporta aparte', async () => {
        const cfdi1 = await service.create(createValidCFDIDto());
        const cfdi2 = await service.create(createValidCFDIDto());

        await expect(service.stampCFDI(cfdi1.id)).rejects.toThrow();
        await expect(service.stampCFDI(cfdi2.id)).rejects.toThrow();

        const stats = await service.getStats('org-123');

        expect(stats.totalEmitidos).toBe(0);
        expect(stats.totalActivos).toBe(0);
        expect(stats.totalCancelados).toBe(0);
        expect(stats.totalMock).toBe(2);
        expect(stats.montoTotal).toBe(0);
        expect(stats.ivaTotal).toBe(0);
        expect(stats.subtotal).toBe(0);
      });
    });

    describe('validateRFC', () => {
      it('valida RFC de persona moral', () => {
        expect(service.validateRFC('ABC123456XYZ')).toBe(true);
      });

      it('valida RFC de persona física', () => {
        expect(service.validateRFC('XAXX010101000')).toBe(true);
      });

      it('rechaza RFC inválido', () => {
        expect(service.validateRFC('INVALID')).toBe(false);
        expect(service.validateRFC('123456789')).toBe(false);
        expect(service.validateRFC('')).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------
  // Con credenciales de PAC pero sin cliente de timbrado implementado
  // ---------------------------------------------------------------------
  describe('con credenciales de PAC pero sin cliente real', () => {
    let service: CFDIService;

    beforeEach(async () => {
      process.env.PAC_API_URL = 'https://api.pac-test.test';
      process.env.PAC_API_KEY = 'test-api-key';
      process.env.RFC_EMISOR = 'XAXX010101000';
      process.env.NOMBRE_EMISOR = 'Mi Cafetería Test S.A. de C.V.';
      process.env.REGIMEN_FISCAL = '601';
      process.env.LUGAR_EXPEDICION = '06600';
      service = await buildService();
    });

    it('reporta el PAC como configurado', () => {
      expect(service.isPacConfigured()).toBe(true);
    });

    it('el timbrado falla con 501 y no marca el CFDI como timbrado', async () => {
      const cfdi = await service.create(createValidCFDIDto());

      await expect(service.stampCFDI(cfdi.id)).rejects.toThrow(
        NotImplementedException,
      );

      const after = await service.findById(cfdi.id);
      expect(after.status).toBe('error');
      expect(after.status).not.toBe('stamped');
      expect(after.uuid).toBeUndefined();
      expect(after.xmlContent).toBeUndefined();
      expect(after.errorMessage).toMatch(/no está implementado/);
    });

    it('la cancelación de un CFDI inexistente sigue siendo 404', async () => {
      const cancelDto: CancelCFDIDto = {
        uuid: 'uuid-inexistente',
        organization_id: 'org-123',
        motivoCancelacion: MotivoCancelacion.COMPROBANTE_EMITIDO_CON_ERRORES,
        rfc: 'XAXX010101000',
      };

      await expect(service.cancel(cancelDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('no se puede descargar el XML de un borrador', async () => {
      const cfdi = await service.create(createValidCFDIDto());

      await expect(service.downloadXML(cfdi.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ---------------------------------------------------------------------
  // Contrato pendiente: qué debe pasar cuando exista un PAC real
  // ---------------------------------------------------------------------
  describe('PENDIENTE: comportamiento con PAC real (stampWithPac/cancelWithPac)', () => {
    // Habilitar cuando `stampWithPac` llame de verdad al PAC. El PAC es quien
    // devuelve UUID, SelloCFD, SelloSAT, NoCertificadoSAT, cadena original y
    // el XML timbrado; este servicio solo debe persistir esa respuesta.
    it.skip('timbra contra el PAC y solo entonces marca status "stamped"', async () => {
      const service = await buildService();
      const cfdi = await service.create(createValidCFDIDto());

      const result = await service.stampCFDI(cfdi.id);

      expect(result.success).toBe(true);
      // UUID real del SAT (36 caracteres, formato canónico), no inventado aquí.
      expect(result.uuid).toMatch(
        /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/,
      );
      expect(result.sello).toBeDefined();
      expect(result.noCertificado).toBeDefined();

      const stamped = await service.findById(cfdi.id);
      expect(stamped.status).toBe('stamped');
      expect(stamped.uuid).toBe(result.uuid);

      // El XML timbrado ya se puede entregar: viene firmado por el PAC.
      const xml = await service.downloadXML(cfdi.id);
      expect(xml).toContain('TimbreFiscalDigital');
      expect(xml).toContain(result.uuid as string);
    });

    // Habilitar cuando `cancelWithPac` envíe la solicitud de cancelación real.
    it.skip('cancela contra el SAT y guarda el acuse', async () => {
      const service = await buildService();
      const cfdi = await service.create(createValidCFDIDto());
      const stampResult = await service.stampCFDI(cfdi.id);

      const result = await service.cancel({
        uuid: stampResult.uuid as string,
        organization_id: 'org-123',
        motivoCancelacion: MotivoCancelacion.COMPROBANTE_EMITIDO_CON_ERRORES,
        rfc: 'XAXX010101000',
      });

      expect(result.success).toBe(true);
      expect(result.fechaCancelacion).toBeDefined();
      expect((await service.findById(cfdi.id)).status).toBe('cancelled');
    });
  });
});
