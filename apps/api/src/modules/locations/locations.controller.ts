import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
  QueryLocationsDto,
  LocationHoursDto,
} from './dto';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateLocationDto) {
    return this.locationsService.create(createDto);
  }

  @Get()
  findAll(@Query() query: QueryLocationsDto) {
    return this.locationsService.findAll(query);
  }

  @Get('stats/:organizationId')
  getStats(@Param('organizationId') organizationId: string) {
    return this.locationsService.getStats(organizationId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.locationsService.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateLocationDto) {
    return this.locationsService.update(id, updateDto);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.locationsService.activate(id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.locationsService.deactivate(id);
  }

  @Patch(':id/hours')
  updateHours(@Param('id') id: string, @Body() body: { hours: LocationHoursDto[] }) {
    return this.locationsService.updateHours(id, body.hours);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.locationsService.delete(id);
  }
}
