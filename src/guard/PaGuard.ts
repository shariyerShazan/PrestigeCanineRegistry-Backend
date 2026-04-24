/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../main/prisma/prisma.service';
import { RoleType } from '../../generated/prisma/enums';

@Injectable()
export class PaGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.userId || request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        roleType: true, 
        pcrPrefix: true 
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.roleType === RoleType.SUPER_ADMIN) {
      return true;
    }

    if (user.pcrPrefix !== 'PA') {
      throw new ForbiddenException(
        'Access denied: This section is strictly for Prestige Ambassadors.',
      );
    }

    return true;
  }
}