// admin-stats.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminStatsService } from './admin-stats.service';
// import { AuthGuard } from '@nestjs/passport'; // Or your custom guard
import { RoleGuard } from '../../guard/role.guard';
import { Roles } from '../../decorator/roles.decorator';
import { RoleType } from '../../../generated/prisma/enums';
import { JwtAuthGuard } from '../../guard/jwt.auth.guard';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get()
  async getStats() {
    return this.adminStatsService.getDashboardStats();
  }
}
