import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Request,
  Sse,
  HttpCode,
  HttpStatus,
  MessageEvent,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { PageOptionsDto } from '../../common/pagination/page-options.dto';

class NotificationFilterDto extends PageOptionsDto {
  unreadOnly?: boolean;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Query() filter: NotificationFilterDto, @Request() req: any) {
    return this.notificationsService.findAll(req.user.sub, filter);
  }

  @Sse('stream')
  stream(@Request() req: any): Observable<MessageEvent> {
    const userId = req.user.sub;
    const subject = this.notificationsService.getUserStream(userId);

    const observable = new Observable<MessageEvent>((observer) => {
      const subscription = subject.subscribe({
        next: (data) => observer.next(data),
      });

      const timeout = setTimeout(() => {
        observer.complete();
      }, 60_000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
        this.notificationsService.removeUserStream(userId);
      };
    });

    return observable;
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(@Param('id') id: string, @Request() req: any) {
    try {
      await this.notificationsService.markRead(id, req.user.sub);
    } catch (err: any) {
      if (err.message === 'NOTIFICATION_NOT_FOUND')
        throw new NotFoundException('NOTIFICATION_NOT_FOUND');
      if (err.message === 'NOT_YOUR_NOTIFICATION')
        throw new ForbiddenException('NOT_YOUR_NOTIFICATION');
      throw err;
    }
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.sub);
  }
}
