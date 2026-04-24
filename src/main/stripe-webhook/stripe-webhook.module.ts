import { Module } from '@nestjs/common';
import { StripeWebhookService } from './stripe-webhook.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { LitterService } from '../litter/litter.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { PaymentService } from '../payment/payment.service';
import { CertificateRequestService } from '../admin/certificate-request/certificate-request.service';
import { OwnershipTransferService } from '../owner-transfer/owner-transfer.service';
import { MailService } from '../mail/mail.service';

@Module({
  providers: [
    StripeWebhookService,
    PrismaService,
    NotificationsService,
    NotificationsGateway,
    LitterService,
    CloudinaryService,
    PaymentService,
    CertificateRequestService,
    OwnershipTransferService,
    MailService
  ],
  controllers: [StripeWebhookController],
})
export class StripeWebhookModule {}
