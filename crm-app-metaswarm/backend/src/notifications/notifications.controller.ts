import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RoleName } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface ActorPayload {
  sub: string;
  email: string;
  role: RoleName;
  teamIds: string[];
}

interface NotificationQuery {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

const ALL_ROLES = [
  RoleName.SYSTEM_ADMINISTRATOR,
  RoleName.SALES_MANAGER,
  RoleName.SALES_REPRESENTATIVE,
  RoleName.SUPPORT_REPRESENTATIVE,
  RoleName.READ_ONLY,
];

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(...ALL_ROLES)
  async findAll(
    @Query() query: NotificationQuery,
    @CurrentUser() actor: ActorPayload,
  ) {
    const page = Number(query.page ?? 1);
    const pageSize = Math.min(Number(query.pageSize ?? 20), 50);
    const unreadOnly = String(query.unreadOnly) === 'true';
    return this.notificationsService.findAll(actor.sub, { page, pageSize, unreadOnly });
  }

  @Get('stream')
  @Roles(...ALL_ROLES)
  async stream(@CurrentUser() actor: ActorPayload, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const notifications = await this.notificationsService.getUnreadForStream(actor.sub);
    for (const n of notifications) {
      res.write(`data: ${JSON.stringify(n)}\n\n`);
    }

    const timeout = setTimeout(() => res.end(), 60_000);
    res.on('close', () => clearTimeout(timeout));
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...ALL_ROLES)
  async markRead(
    @Param('id') id: string,
    @CurrentUser() actor: ActorPayload,
  ): Promise<void> {
    await this.notificationsService.markRead(id, actor.sub);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...ALL_ROLES)
  async markAllRead(@CurrentUser() actor: ActorPayload): Promise<void> {
    await this.notificationsService.markAllRead(actor.sub);
  }
}
