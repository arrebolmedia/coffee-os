import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { PermitsService } from './permits.service';
import { CreatePermitDto, UpdatePermitDto, QueryFinanceDto } from './dto';

@Controller('finance/permits')
export class PermitsController {
  constructor(private readonly permitsService: PermitsService) {}

  @Post()
  async create(@Body() createDto: CreatePermitDto) {
    return this.permitsService.create(createDto);
  }

  @Get()
  async findAll(@Query() query: QueryFinanceDto) {
    return this.permitsService.findAll(query);
  }

  @Get('stats')
  async getStats(
    @Query('organization_id') organizationId: string,
    @Query('location_id') locationId?: string,
  ) {
    return this.permitsService.getStats(organizationId, locationId);
  }

  @Get('expiring-soon')
  async getExpiringSoon(
    @Query('organization_id') organizationId: string,
    @Query('days') days?: number,
  ) {
    return this.permitsService.getExpiringSoon(organizationId, days ? parseInt(days as any) : 30);
  }

  @Get('expired')
  async getExpired(@Query('organization_id') organizationId: string) {
    return this.permitsService.getExpired(organizationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.permitsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdatePermitDto) {
    return this.permitsService.update(id, updateDto);
  }

  @Post(':id/renew')
  async renewPermit(
    @Param('id') id: string,
    @Body() body: { expiry_date: string; renewal_cost?: number },
  ) {
    return this.permitsService.renewPermit(id, new Date(body.expiry_date), body.renewal_cost);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.permitsService.delete(id);
    return { message: 'Permit deleted successfully' };
  }
}
