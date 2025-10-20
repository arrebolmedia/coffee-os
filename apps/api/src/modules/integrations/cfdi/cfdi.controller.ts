import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { CFDIService } from './cfdi.service';
import { CreateCFDIDto, CancelCFDIDto } from './dto';

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
   * Timbrar un CFDI con el PAC
   */
  @Post(':id/stamp')
  @HttpCode(HttpStatus.OK)
  async stamp(@Param('id') id: string) {
    return this.cfdiService.stampCFDI(id);
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
   * Obtener un CFDI por ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.cfdiService.findById(id);
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
    @Param('organization_id') organization_id: string,
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
   * Descargar XML de un CFDI
   */
  @Get(':id/xml')
  @Header('Content-Type', 'application/xml')
  @Header('Content-Disposition', 'attachment; filename="cfdi.xml"')
  async downloadXML(@Param('id') id: string) {
    return this.cfdiService.downloadXML(id);
  }

  /**
   * Obtener estadísticas de CFDIs
   */
  @Get('organization/:organization_id/stats')
  async getStats(
    @Param('organization_id') organization_id: string,
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
}
