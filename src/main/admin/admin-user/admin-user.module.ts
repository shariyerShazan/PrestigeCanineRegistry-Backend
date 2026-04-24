import { Module } from '@nestjs/common';
import { AdminUserService } from './admin-user.service';
import { AdminUserController } from './admin-user.controller';
import { PrismaService } from '../../../main/prisma/prisma.service';
import { MailService } from '../../../main/mail/mail.service';
// import { PermissionGuard } from 'src/guard/permission.guard';
import { PermissionService } from '../permission/permission.service';
import { PermissionGuard } from '../../../guard/permission.guard';

@Module({
  providers: [
    AdminUserService,
    PrismaService,
    MailService,
    PermissionService,
    PermissionGuard,
  ],
  controllers: [AdminUserController],
})
export class AdminUserModule {}
