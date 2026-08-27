import { Controller, Get, Query } from '@nestjs/common';
import { PosService } from './pos.service';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';

@Controller('pos/stats')
export class PosStatsController {
  constructor(private readonly posService: PosService) {}

  // El corte de caja sale de la organización del JWT. El `:orgId` del path se
  // mantiene por compatibilidad con las URLs del POS y lo valida el
  // TenantGuard, pero no es quien decide qué se suma: cuando decidía, bastaba
  // poner ahí el id de otra cafetería para leer sus ventas del día.
  @Get('daily/:orgId')
  async getDailyStats(
    @CurrentOrg() organizationId: string,
    @Query('date') date?: string,
  ) {
    return this.posService.getDailyStats(organizationId, date);
  }
}
