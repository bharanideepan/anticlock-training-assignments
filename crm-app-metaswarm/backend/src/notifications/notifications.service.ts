import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationQueryDto {
  page: number;
  pageSize: number;
  unreadOnly: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: NotificationQueryDto) {
    const { page = 1, pageSize = 20, unreadOnly = false } = query;
    const where: Record<string, unknown> = { userId };
    if (unreadOnly) where['isRead'] = false;

    const skip = (page - 1) * pageSize;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: notifications,
      meta: { total, unreadCount, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id } });

    if (!notification) {
      throw new NotFoundException({ code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found' });
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException({ code: 'NOT_YOUR_NOTIFICATION', message: 'Access denied' });
    }

    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadForStream(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, type: true, title: true, isRead: true, createdAt: true },
    });
  }
}
