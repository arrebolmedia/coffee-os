import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { PosService } from './pos.service';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import {
  CurrentUser,
  CurrentUserType,
} from '../auth/decorators/current-user.decorator';

@Controller('pos/tickets')
export class TicketController {
  constructor(private readonly posService: PosService) {}

  // Las tres rutas van acotadas a la organización del JWT. Ninguna lo estaba:
  // el listado aceptaba la sucursal de otra cafetería por query, el detalle
  // devolvía cualquier ticket con sólo tener su id —líneas, pagos y cliente
  // incluidos—, y la creación dejaba registrar una venta en la sucursal ajena.
  @Get()
  async findAll(
    @Query('locationId') locationId: string,
    @CurrentOrg() organizationId: string,
  ) {
    return this.posService.findAllTickets(locationId, organizationId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentOrg() organizationId: string) {
    const ticket = await this.posService.findOneTicket(id, organizationId);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    return ticket;
  }

  @Post()
  async create(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    data: CreateTicketDto,
    @CurrentOrg() organizationId: string,
  ) {
    return this.posService.createTicket(data, organizationId);
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
