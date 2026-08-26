import { Controller, Get, Param } from '@nestjs/common';
import { RFMService } from './rfm.service';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';

@Controller('crm/rfm')
export class RFMController {
  constructor(private readonly rfmService: RFMService) {}

  @Get('calculate/:customerId')
  async calculateCustomerRFM(@Param('customerId') customerId: string) {
    return this.rfmService.calculateCustomerRFM(customerId);
  }

  @Get('distribution')
  async getSegmentDistribution(@CurrentOrg() organizationId: string) {
    return this.rfmService.getSegmentDistribution(
      organizationId || 'org_default',
    );
  }
}
