import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CFDIService } from '../cfdi/cfdi.service';
import {
  CreateCFDIDto,
  CancelCFDIDto,
  TipoComprobante,
  MetodoPago,
  FormaPago,
  UsoCFDI,
  RegimenFiscal,
  MotivoCancelacion,
} from '../cfdi/dto';

describe('CFDIService', () => {
  let service: CFDIService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CFDIService],
    }).compile();

    service = module.get<CFDIService>(CFDIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

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

  describe('create', () => {
    it('should create a valid CFDI', async () => {
      const dto = createValidCFDIDto();
      const cfdi = await service.create(dto);

      expect(cfdi).toBeDefined();
      expect(cfdi.id).toBeDefined();
      expect(cfdi.organization_id).toBe('org-123');
      expect(cfdi.status).toBe('draft');
      expect(cfdi.totales).toBeDefined();
      expect(cfdi.totales.subtotal).toBe(90);
      expect(cfdi.totales.totalImpuestosTrasladados).toBe(14.4);
      expect(cfdi.totales.total).toBe(104.4);
    });

    it('should reject CFDI with invalid RFC', async () => {
      const dto = createValidCFDIDto();
      dto.receptor.rfc = 'INVALID';

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject CFDI without conceptos', async () => {
      const dto = createValidCFDIDto();
      dto.conceptos = [];

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should calculate totales correctly with discount', async () => {
      const dto = createValidCFDIDto();
      dto.conceptos[0].descuento = 10;

      const cfdi = await service.create(dto);

      expect(cfdi.totales.subtotal).toBe(90);
      expect(cfdi.totales.descuento).toBe(10);
      expect(cfdi.totales.total).toBe(94.4); // 90 - 10 + 14.4
    });
  });

  describe('stampCFDI', () => {
    it('should stamp a draft CFDI', async () => {
      const dto = createValidCFDIDto();
      const cfdi = await service.create(dto);

      const result = await service.stampCFDI(cfdi.id);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.uuid).toBeDefined();
      expect(result.xml).toBeDefined();
      expect(result.pdf).toBeDefined();

      const stamped = await service.findById(cfdi.id);
      expect(stamped.status).toBe('stamped');
      expect(stamped.uuid).toBe(result.uuid);
    });

    it('should reject stamping already stamped CFDI', async () => {
      const dto = createValidCFDIDto();
      const cfdi = await service.create(dto);

      await service.stampCFDI(cfdi.id);

      await expect(service.stampCFDI(cfdi.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject stamping non-existent CFDI', async () => {
      await expect(service.stampCFDI('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a stamped CFDI', async () => {
      const dto = createValidCFDIDto();
      const cfdi = await service.create(dto);
      const stampResult = await service.stampCFDI(cfdi.id);

      const cancelDto: CancelCFDIDto = {
        uuid: stampResult.uuid!,
        organization_id: 'org-123',
        motivoCancelacion: MotivoCancelacion.COMPROBANTE_EMITIDO_CON_ERRORES,
        rfc: 'XAXX010101000',
      };

      const result = await service.cancel(cancelDto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.uuid).toBe(stampResult.uuid);
      expect(result.fechaCancelacion).toBeDefined();

      const cancelled = await service.findById(cfdi.id);
      expect(cancelled.status).toBe('cancelled');
    });

    it('should reject cancelling non-stamped CFDI', async () => {
      const dto = createValidCFDIDto();
      const cfdi = await service.create(dto);

      const cancelDto: CancelCFDIDto = {
        uuid: 'fake-uuid',
        organization_id: 'org-123',
        motivoCancelacion: MotivoCancelacion.COMPROBANTE_EMITIDO_CON_ERRORES,
        rfc: 'XAXX010101000',
      };

      await expect(service.cancel(cancelDto)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find a CFDI by ID', async () => {
      const dto = createValidCFDIDto();
      const created = await service.create(dto);

      const found = await service.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    it('should throw NotFoundException for non-existent ID', async () => {
      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUUID', () => {
    it('should find a CFDI by UUID', async () => {
      const dto = createValidCFDIDto();
      const cfdi = await service.create(dto);
      const stampResult = await service.stampCFDI(cfdi.id);

      const found = await service.findByUUID(stampResult.uuid!);

      expect(found).toBeDefined();
      expect(found.uuid).toBe(stampResult.uuid);
    });

    it('should throw NotFoundException for non-existent UUID', async () => {
      await expect(service.findByUUID('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all CFDIs for an organization', async () => {
      const dto1 = createValidCFDIDto();
      const dto2 = createValidCFDIDto();
      dto2.order_id = 'order-999';

      await service.create(dto1);
      await service.create(dto2);

      const cfdis = await service.findAll('org-123');

      expect(cfdis).toBeDefined();
      expect(cfdis.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter CFDIs by location', async () => {
      const dto1 = createValidCFDIDto();
      dto1.location_id = 'loc-111';
      const dto2 = createValidCFDIDto();
      dto2.location_id = 'loc-222';

      await service.create(dto1);
      await service.create(dto2);

      const cfdis = await service.findAll('org-123', { location_id: 'loc-111' });

      expect(cfdis.every((c) => c.location_id === 'loc-111')).toBe(true);
    });

    it('should filter CFDIs by status', async () => {
      const dto = createValidCFDIDto();
      const cfdi = await service.create(dto);
      await service.stampCFDI(cfdi.id);

      const cfdis = await service.findAll('org-123', { status: 'stamped' });

      expect(cfdis.every((c) => c.status === 'stamped')).toBe(true);
    });
  });

  describe('downloadXML', () => {
    it('should download XML of stamped CFDI', async () => {
      const dto = createValidCFDIDto();
      const cfdi = await service.create(dto);
      await service.stampCFDI(cfdi.id);

      const xml = await service.downloadXML(cfdi.id);

      expect(xml).toBeDefined();
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('cfdi:Comprobante');
      expect(xml).toContain('TimbreFiscalDigital');
    });

    it('should reject downloading XML of non-stamped CFDI', async () => {
      const dto = createValidCFDIDto();
      const cfdi = await service.create(dto);

      await expect(service.downloadXML(cfdi.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStats', () => {
    it('should calculate statistics correctly', async () => {
      const dto1 = createValidCFDIDto();
      const dto2 = createValidCFDIDto();

      const cfdi1 = await service.create(dto1);
      const cfdi2 = await service.create(dto2);

      await service.stampCFDI(cfdi1.id);
      await service.stampCFDI(cfdi2.id);

      const stats = await service.getStats('org-123');

      expect(stats).toBeDefined();
      expect(stats.totalEmitidos).toBeGreaterThanOrEqual(2);
      expect(stats.subtotal).toBeGreaterThan(0);
      expect(stats.ivaTotal).toBeGreaterThan(0);
      expect(stats.montoTotal).toBeGreaterThan(0);
      expect(stats.porTipoComprobante).toBeDefined();
      expect(stats.porFormaPago).toBeDefined();
    });
  });

  describe('validateRFC', () => {
    it('should validate correct RFC for persona moral', () => {
      expect(service.validateRFC('ABC123456XYZ')).toBe(true);
    });

    it('should validate correct RFC for persona física', () => {
      expect(service.validateRFC('XAXX010101000')).toBe(true);
    });

    it('should reject invalid RFC', () => {
      expect(service.validateRFC('INVALID')).toBe(false);
      expect(service.validateRFC('123456789')).toBe(false);
      expect(service.validateRFC('')).toBe(false);
    });
  });
});
