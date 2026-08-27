import { Controller, Get } from '@nestjs/common';
import { PosService } from './pos.service';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';

@Controller('pos/payment-methods')
export class PosPaymentMethodsController {
  constructor(private readonly posService: PosService) {}

  // Hoy devuelve una lista fija, así que no había nada que filtrar; pero el día
  // que salga de la base, la organización tiene que venir del JWT y no del
  // path. Ver la nota en PosStatsController.
  @Get(':orgId')
  async getPaymentMethods(@CurrentOrg() organizationId: string) {
    return this.posService.getPaymentMethods(organizationId);
  }
}
