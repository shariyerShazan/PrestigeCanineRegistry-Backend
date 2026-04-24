import { Module } from '@nestjs/common';
import { AdminLitterController } from './admin-litter.controller';
import { AdminLitterService } from './admin-litter.service';
import { PrismaService } from '../../../main/prisma/prisma.service';
import { PermissionService } from '../permission/permission.service';

@Module({
  controllers: [AdminLitterController],
  providers: [AdminLitterService, PrismaService, PermissionService],
})
export class AdminLitterModule {}
