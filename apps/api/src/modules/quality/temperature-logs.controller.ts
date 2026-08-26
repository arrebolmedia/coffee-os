import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { TemperatureLogsService } from './temperature-logs.service';
import { CreateTemperatureLogDto, QueryTemperatureLogsDto } from './dto';
import { TemperatureLog } from './interfaces';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';

@Controller('quality/temperature-logs')
export class TemperatureLogsController {
  constructor(
    private readonly temperatureLogsService: TemperatureLogsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateTemperatureLogDto,
  ): Promise<TemperatureLog> {
    return this.temperatureLogsService.create(createDto);
  }

  @Get()
  async findAll(
    @Query() query: QueryTemperatureLogsDto,
    @CurrentOrg() organizationId: string,
  ): Promise<TemperatureLog[]> {
    return this.temperatureLogsService.findAll({
      ...query,
      organization_id: organizationId,
    });
  }

  @Get('alerts')
  async getAlerts(
    @CurrentOrg() organizationId: string,
    @Query('location_id') locationId?: string,
  ): Promise<TemperatureLog[]> {
    return this.temperatureLogsService.getAlerts(organizationId, locationId);
  }

  @Get('stats')
  async getStats(
    @CurrentOrg() organizationId: string,
    @Query('location_id') locationId?: string,
  ): Promise<any> {
    return this.temperatureLogsService.getStats(organizationId, locationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TemperatureLog> {
    const log = await this.temperatureLogsService.findOne(id);
    if (!log) {
      throw new Error('Temperature log not found');
    }
    return log;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.temperatureLogsService.delete(id);
  }
}
