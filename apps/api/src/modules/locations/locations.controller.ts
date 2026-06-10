import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto, QueryLocationsDto, UpdateLocationDto } from './dto';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateLocationDto) {
    return this.locationsService.create(createDto);
  }

  @Get()
  findAll(@Query() query: QueryLocationsDto) {
    return this.locationsService.findAll(query);
  }

  /**
   * Estadísticas por organización. El path param se conserva por compat.
   * pero SIEMPRE usamos el organizationId del JWT — el path se ignora.
   */
  @Get('stats/:organizationId')
  getStats(
    @Param('organizationId') _organizationId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.locationsService.getStats(this.requireOrg(user));
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.locationsService.delete(id);
  }
}
