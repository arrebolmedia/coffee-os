import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { PosService } from './pos.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';

@Controller('pos/tickets')
export class TicketController {
  constructor(private readonly posService: PosService) {}

  @Get()
  async findAll(@Query('locationId') locationId: string) {
    return this.posService.findAllTickets(locationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.posService.findOneTicket(id);
  }

  @Post()
  async create(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    data: CreateTicketDto,
  ) {
    return this.posService.createTicket(data);
  }

  @Patch(':id/close')
  async close(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    data: CloseTicketDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.posService.closeTicket(id, data.payments, user.organizationId);
  }
}
