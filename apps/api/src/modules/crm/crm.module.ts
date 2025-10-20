import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { LoyaltyController } from './loyalty.controller';
import { CampaignsController } from './campaigns.controller';
import { RFMController } from './rfm.controller';
import { CustomersService } from './customers.service';
import { LoyaltyService } from './loyalty.service';
import { CampaignsService } from './campaigns.service';
import { RFMService } from './rfm.service';

@Module({
  controllers: [CustomersController, LoyaltyController, CampaignsController, RFMController],
  providers: [CustomersService, LoyaltyService, CampaignsService, RFMService],
  exports: [CustomersService, LoyaltyService, CampaignsService, RFMService],
})
export class CrmModule {}

