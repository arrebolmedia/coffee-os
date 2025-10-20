import { Module } from '@nestjs/common';
import { TwilioService } from './twilio/twilio.service';
import { TwilioController } from './twilio/twilio.controller';
import { MailrelayService } from './mailrelay/mailrelay.service';
import { MailrelayController } from './mailrelay/mailrelay.controller';
import { CFDIService } from './cfdi/cfdi.service';
import { CFDIController } from './cfdi/cfdi.controller';

@Module({
  controllers: [TwilioController, MailrelayController, CFDIController],
  providers: [TwilioService, MailrelayService, CFDIService],
  exports: [TwilioService, MailrelayService, CFDIService],
})
export class IntegrationsModule {}
