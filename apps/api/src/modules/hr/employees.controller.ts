import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, QueryEmployeesDto, UpdateEmployeeDto } from './dto';
import { Employee } from './interfaces';

@Controller('hr/employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateEmployeeDto): Promise<Employee> {
    return this.employeesService.create(createDto);
  }

  @Get()
  async findAll(@Query() query: QueryEmployeesDto): Promise<Employee[]> {
    return this.employeesService.findAll(query);
  }

  @Get('stats')
  async getStats(
    @Query('organization_id') organizationId: string,
    @Query('location_id') locationId?: string,
  ): Promise<any> {
    return this.employeesService.getStats(organizationId, locationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Employee> {
    const employee = await this.employeesService.findOne(id);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEmployeeDto,
  ): Promise<Employee> {
    return this.employeesService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.employeesService.delete(id);
  }
}
