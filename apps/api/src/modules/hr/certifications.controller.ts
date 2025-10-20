import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CertificationsService } from './certifications.service';
import { CreateCertificationDto, QueryCertificationsDto, CertificationStatus } from './dto';
import { Certification } from './interfaces';

@Controller('hr/certifications')
export class CertificationsController {
  constructor(private readonly certificationsService: CertificationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateCertificationDto,
    @Query('organization_id') organizationId: string,
  ): Promise<Certification> {
    return this.certificationsService.create(createDto, organizationId);
  }

  @Get()
  async findAll(@Query() query: QueryCertificationsDto): Promise<Certification[]> {
    return this.certificationsService.findAll(query);
  }

  @Get('expiring')
  async getExpiring(
    @Query('organization_id') organizationId: string,
    @Query('days') days?: string,
  ): Promise<Certification[]> {
    return this.certificationsService.getExpiring(organizationId, days ? parseInt(days) : 30);
  }

  @Get('stats')
  async getStats(@Query('organization_id') organizationId: string): Promise<any> {
    return this.certificationsService.getStats(organizationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Certification> {
    const cert = await this.certificationsService.findOne(id);
    if (!cert) {
      throw new Error('Certification not found');
    }
    return cert;
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: CertificationStatus,
  ): Promise<Certification> {
    return this.certificationsService.updateStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.certificationsService.delete(id);
  }
}
