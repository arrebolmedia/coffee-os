import { Controller, Get, Query } from '@nestjs/common';
import { RFMService } from './rfm.service';

@Controller('crm/rfm')
export class RFMController {
  constructor(private readonly rfmService: RFMService) {}

  @Get('calculate/:customerId')
  async calculateCustomerRFM(@Query('customerId') customerId: string) {
    return this.rfmService.calculateCustomerRFM(customerId);
  }

  @Get('distribution')
  async getSegmentDistribution(@Query('organization_id') organizationId: string) {
    return this.rfmService.getSegmentDistribution(organizationId || 'org_default');
  }
}
