import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PermitsService } from './permits.service';
import { CreatePermitDto, QueryFinanceDto, UpdatePermitDto } from './dto';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';

@Controller('finance/permits')
export class PermitsController {
  constructor(private readonly permitsService: PermitsService) {}

  @Post()
  async create(@Body() createDto: CreatePermitDto) {
    return this.permitsService.create(createDto);
  }

  @Get()
  async findAll(
    @Query() query: QueryFinanceDto,
    @CurrentOrg() organizationId: string,
  ) {
    return this.permitsService.findAll({
      ...query,
      organization_id: organizationId,
    });
  }

  @Get('stats')
  async getStats(
    @CurrentOrg() organizationId: string,
    @Query('location_id') locationId?: string,
  ) {
    return this.permitsService.getStats(organizationId, locationId);
  }

  @Get('expiring-soon')
  async getExpiringSoon(
    @CurrentOrg() organizationId: string,
    @Query('days') days?: number,
  ) {
    return this.permitsService.getExpiringSoon(
      organizationId,
      days ? parseInt(days as any) : 30,
    );
  }

  @Get('expired')
  async getExpired(@CurrentOrg() organizationId: string) {
    return this.permitsService.getExpired(organizationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentOrg() organizationId: string) {
    return this.permitsService.findOne(id, organizationId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePermitDto,
    @CurrentOrg() organizationId: string,
  ) {
    return this.permitsService.update(id, updateDto, organizationId);
  }

  @Post(':id/renew')
  async renewPermit(
    @Param('id') id: string,
    @Body() body: { expiry_date: string; renewal_cost?: number },
    @CurrentOrg() organizationId: string,
  ) {
    return this.permitsService.renewPermit(
      id,
      new Date(body.expiry_date),
      organizationId,
      body.renewal_cost,
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.permitsService.delete(id);
    return { message: 'Permit deleted successfully' };
  }
}
