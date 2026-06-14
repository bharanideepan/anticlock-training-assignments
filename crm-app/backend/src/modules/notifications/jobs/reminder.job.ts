import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class ReminderJob {
  private readonly logger = new Logger(ReminderJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 8 * * *')
  async sendReminders() {
    this.logger.log('Running daily task reminder job');
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const [dueTomorrow, overdueTasks] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          status: 'OPEN',
          dueDate: { gte: tomorrowStart, lte: tomorrow },
        },
        select: { id: true, title: true, assigneeId: true },
      }),
      this.prisma.task.findMany({
        where: { status: 'OPEN', dueDate: { lt: now } },
        select: { id: true, title: true, assigneeId: true },
      }),
    ]);

    for (const task of dueTomorrow) {
      if (!task.assigneeId) continue;
      await this.notificationsService.createAndSend({
        userId: task.assigneeId,
        type: 'DUE_DATE_REMINDER',
        title: 'Task due tomorrow',
        body: `"${task.title}" is due tomorrow.`,
        resourceType: 'TASK',
        resourceId: task.id,
      });
    }

    for (const task of overdueTasks) {
      if (!task.assigneeId) continue;
      await this.notificationsService.createAndSend({
        userId: task.assigneeId,
        type: 'OVERDUE_TASK',
        title: 'Task overdue',
        body: `"${task.title}" is past due.`,
        resourceType: 'TASK',
        resourceId: task.id,
      });
    }

    this.logger.log(
      `Sent ${dueTomorrow.length} reminders, ${overdueTasks.length} overdue alerts`,
    );
  }
}
