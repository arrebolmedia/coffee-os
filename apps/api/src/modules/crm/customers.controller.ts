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
  UnauthorizedException,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, QueryCustomersDto, UpdateCustomerDto } from './dto';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';

@Controller('crm/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

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
  async create(
    @Body() createDto: CreateCustomerDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.customersService.create(createDto, this.requireOrg(user));
  }

  @Get()
  async findAll(
    @Query() query: QueryCustomersDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.customersService.findAll({
      ...query,
      organization_id: this.requireOrg(user),
    });
  }

  @Get('stats')
  async getStats(@CurrentUser() user: CurrentUserType) {
    return this.customersService.getStats(this.requireOrg(user));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    const organizationId = this.requireOrg(user);
    const customer = await this.customersService.findOne(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    if (customer.organization_id !== organizationId) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const organizationId = this.requireOrg(user);
    const existing = await this.customersService.findOne(id);
    if (!existing || existing.organization_id !== organizationId) {
      throw new NotFoundException('Customer not found');
    }
    return this.customersService.update(id, updateDto);
  }

  @Post(':id/visit')
  @HttpCode(HttpStatus.OK)
  async addVisit(
    @Param('id') id: string,
    @Body() body: { order_total: number },
    @CurrentUser() user: CurrentUserType,
  ) {
    const organizationId = this.requireOrg(user);
    const existing = await this.customersService.findOne(id);
    if (!existing || existing.organization_id !== organizationId) {
      throw new NotFoundException('Customer not found');
    }
    return this.customersService.addVisit(id, body.order_total);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    const organizationId = this.requireOrg(user);
    const existing = await this.customersService.findOne(id);
    if (!existing || existing.organization_id !== organizationId) {
      throw new NotFoundException('Customer not found');
    }
    await this.customersService.delete(id);
  }
}
