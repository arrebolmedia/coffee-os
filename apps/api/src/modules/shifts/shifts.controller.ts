import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';

@ApiTags('shifts')
@ApiBearerAuth()
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  private requireOrg(user: CurrentUserType): string {
    if (!user?.organizationId) {
      throw new UnauthorizedException(
        'Authenticated user does not belong to any organization',
      );
    }
    return user.organizationId;
  }

  @Post()
  @ApiOperation({ summary: 'Open a new shift' })
  @ApiResponse({ status: 201, description: 'Shift opened successfully' })
  create(
    @Body() createShiftDto: CreateShiftDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.shiftsService.create(createShiftDto, this.requireOrg(user));
  }

  @Get()
  @ApiOperation({ summary: 'Get all shifts' })
  @ApiResponse({ status: 200, description: 'Returns all shifts' })
  findAll(
    @Query() query: QueryShiftsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.shiftsService.findAll(query, this.requireOrg(user));
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active shift' })
  @ApiResponse({ status: 200, description: 'Returns active shift if exists' })
  findActive() {
    return this.shiftsService.findActive();
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get shifts by status' })
  @ApiResponse({
    status: 200,
    description: 'Returns shifts with specified status',
  })
  findByStatus(@Param('status') status: string) {
    return this.shiftsService.findByStatus(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shift by ID' })
  @ApiResponse({ status: 200, description: 'Returns a single shift' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.shiftsService.findOne(id, this.requireOrg(user));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shift' })
  @ApiResponse({ status: 200, description: 'Shift updated successfully' })
  update(@Param('id') id: string, @Body() updateShiftDto: UpdateShiftDto) {
    return this.shiftsService.update(id, updateShiftDto);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Close a shift' })
  @ApiResponse({ status: 200, description: 'Shift closed successfully' })
  close(
    @Param('id') id: string,
    @Body() closeShiftDto: CloseShiftDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.shiftsService.close(id, closeShiftDto, this.requireOrg(user));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shift' })
  @ApiResponse({ status: 200, description: 'Shift deleted successfully' })
  remove(@Param('id') id: string) {
    return this.shiftsService.remove(id);
  }
}
