import { Module } from '@nestjs/common';
import { AdminCanineService } from './admin-canine.service';
import { AdminCanineController } from './admin-canine.controller';
import { PrismaService } from '../../../main/prisma/prisma.service';
import { PermissionGuard } from '../../../guard/permission.guard';
import { PermissionService } from '../permission/permission.service';

@Module({
  providers: [
    AdminCanineService,
    PrismaService,
    PermissionGuard,
    PermissionService,
  ],
  controllers: [AdminCanineController],
})
export class AdminCanineModule {}
