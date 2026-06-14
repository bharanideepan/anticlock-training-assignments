import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { JwtPayload } from '../decorators/current-user.decorator';
import { Request } from 'express';

export interface VisibilityFilter {
  ownerId?: string;
  ownerIdIn?: string[];
}

export interface RequestWithVisibility extends Request {
  user: JwtPayload;
  visibilityFilter: VisibilityFilter;
}

@Injectable()
export class VisibilityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithVisibility>();
    const { user } = request;

    if (!user) return true;

    switch (user.role as RoleName) {
      case RoleName.SYSTEM_ADMINISTRATOR:
        request.visibilityFilter = {};
        break;
      case RoleName.SALES_MANAGER:
        request.visibilityFilter = user.teamIds.length
          ? { ownerIdIn: [user.sub, ...user.teamIds] }
          : {};
        break;
      case RoleName.SALES_REPRESENTATIVE:
      case RoleName.SUPPORT_REPRESENTATIVE:
      case RoleName.READ_ONLY:
      default:
        request.visibilityFilter = { ownerId: user.sub };
        break;
    }

    return true;
  }
}
