import { Module } from '@nestjs/common';
import { CanineService } from './canine.service';
import { CanineController } from './canine.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { PaymentService } from '../payment/payment.service';

@Module({
  providers: [
    CanineService,
    PrismaService,
    CloudinaryService,
    NotificationsService,
    NotificationsGateway,
    PaymentService,
  ],
  controllers: [CanineController],
})
export class CanineModule {}
