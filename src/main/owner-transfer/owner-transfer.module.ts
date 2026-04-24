import { Module } from '@nestjs/common';

import { OwnerTransferController } from './owner-transfer.controller';
import { OwnershipTransferService } from './owner-transfer.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { PaymentService } from '../payment/payment.service';

@Module({
  providers: [
    OwnershipTransferService,
    PrismaService,
    MailService,
    NotificationsService,
    NotificationsGateway,
    PaymentService
  ],
  controllers: [OwnerTransferController],
  exports: [OwnershipTransferService]
})
export class OwnerTransferModule {}
