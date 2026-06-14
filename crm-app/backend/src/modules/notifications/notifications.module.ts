import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ReminderJob } from './jobs/reminder.job';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [NotificationsService, ReminderJob],
  exports: [NotificationsService],
})
export class NotificationsModule {}
