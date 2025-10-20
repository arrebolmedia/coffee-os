import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';

@ApiTags('shifts')
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @ApiOperation({ summary: 'Open a new shift' })
  @ApiResponse({ status: 201, description: 'Shift opened successfully' })
  create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.create(createShiftDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shifts' })
  @ApiResponse({ status: 200, description: 'Returns all shifts' })
  findAll(@Query() query: QueryShiftsDto) {
    return this.shiftsService.findAll(query);
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
  findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(id);
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
  close(@Param('id') id: string, @Body() closeShiftDto: CloseShiftDto) {
    return this.shiftsService.close(id, closeShiftDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shift' })
  @ApiResponse({ status: 200, description: 'Shift deleted successfully' })
  remove(@Param('id') id: string) {
    return this.shiftsService.remove(id);
  }
}
