import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { PosService } from './pos.service';

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
  async create(@Body() data: any) {
    return this.posService.createTicket(data);
  }

  @Patch(':id/close')
  async close(@Param('id') id: string) {
    return this.posService.closeTicket(id);
  }
}
