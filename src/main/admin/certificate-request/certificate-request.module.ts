import { Module } from '@nestjs/common';
import { CertificateRequestService } from './certificate-request.service';
import { CertificateRequestController } from './certificate-request.controller';
import { PrismaService } from '../../../main/prisma/prisma.service';
import { PermissionService } from '../permission/permission.service';
import { PaymentService } from '../../payment/payment.service';

@Module({
  providers: [CertificateRequestService, PrismaService, PermissionService, PaymentService],
  controllers: [CertificateRequestController],
})
export class CertificateRequestModule {}
