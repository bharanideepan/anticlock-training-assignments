import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/pagination/paginated-result';
import { PageOptionsDto } from '../../common/pagination/page-options.dto';

interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  resourceType?: string;
  resourceId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly streams = new Map<string, Subject<any>>();

  constructor(private readonly prisma: PrismaService) {}

  getUserStream(userId: string): Subject<any> {
    if (!this.streams.has(userId)) {
      this.streams.set(userId, new Subject());
    }
    return this.streams.get(userId)!;
  }

  removeUserStream(userId: string) {
    this.streams.delete(userId);
  }

  async createAndSend(payload: NotificationPayload) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type as any,
        title: payload.title,
        body: payload.body,
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
      },
    });

    const stream = this.streams.get(payload.userId);
    if (stream) {
      stream.next({ data: JSON.stringify(notification) });
    }

    return notification;
  }

  async findAll(
    userId: string,
    filter: PageOptionsDto & { unreadOnly?: boolean },
  ) {
    const where: any = { userId };
    if (filter.unreadOnly) where.isRead = false;
    const page = Number(filter.page) || 1;
    const pageSize = Number(filter.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    const result = paginate(data, total, page, pageSize);
    return { ...result, meta: { ...result.meta, unreadCount } };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) throw new Error('NOTIFICATION_NOT_FOUND');
    if (notification.userId !== userId)
      throw new Error('NOT_YOUR_NOTIFICATION');

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
}
