import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CFDIService } from './cfdi.service';
import { CancelCFDIDto, CreateCFDIDto } from './dto';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';

@Controller('integrations/cfdi')
export class CFDIController {
  constructor(private readonly cfdiService: CFDIService) {}

  /**
   * Crear un CFDI (factura electrónica)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCFDIDto: CreateCFDIDto) {
    return this.cfdiService.create(createCFDIDto);
  }

  /**
   * Cancelar un CFDI
   */
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Body() cancelDto: CancelCFDIDto) {
    return this.cfdiService.cancel(cancelDto);
  }

  /**
   * Timbrar un CFDI con el PAC
   */
  @Post(':id/stamp')
  @HttpCode(HttpStatus.OK)
  async stamp(@Param('id') id: string) {
    return this.cfdiService.stampCFDI(id);
  }

  /**
   * Obtener CFDI por UUID (folio fiscal)
   */
  @Get('uuid/:uuid')
  async findByUUID(@Param('uuid') uuid: string) {
    return this.cfdiService.findByUUID(uuid);
  }

  /**
   * Listar CFDIs de una organización
   */
  @Get('organization/:organization_id')
  async findAll(
    @CurrentOrg() organization_id: string,
    @Query('location_id') location_id?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cfdiService.findAll(organization_id, {
      location_id,
      status: status as any,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * Obtener estadísticas de CFDIs
   */
  @Get('organization/:organization_id/stats')
  async getStats(
    @CurrentOrg() organization_id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cfdiService.getStats(
      organization_id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Validar RFC mexicano
   */
  @Get('validate-rfc/:rfc')
  async validateRFC(@Param('rfc') rfc: string) {
    const valid = this.cfdiService.validateRFC(rfc);
    return {
      rfc,
      valid,
      message: valid ? 'RFC válido' : 'RFC inválido',
    };
  }

  /**
   * Obtener un CFDI por ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.cfdiService.findById(id);
  }

  /**
   * Descargar XML de un CFDI timbrado.
   *
   * Bloqueado mientras no haya PAC real: devuelve 503 y NO entrega XML de
   * comprobantes 'mock' (que no existen ante el SAT). Las cabeceras de XML se
   * ponen solo en el caso de éxito, para que un error viaje como JSON.
   */
  @Get(':id/xml')
  async downloadXML(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const xml = await this.cfdiService.downloadXML(id);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename="cfdi.xml"');
    return xml;
  }
}
