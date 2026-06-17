import { Test, TestingModule } from '@nestjs/testing';
import { RoleName } from '@prisma/client';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockNotificationsService = {
  findAll: jest.fn(),
  markRead: jest.fn(),
  markAllRead: jest.fn(),
  getUnreadForStream: jest.fn(),
};

const adminActor = { sub: 'user-1', email: 'a@b.com', role: RoleName.SYSTEM_ADMINISTRATOR, teamIds: [] as string[] };

const mockNotification = {
  id: 'notif-1', userId: 'user-1', type: 'TASK_ASSIGNED',
  title: 'New task assigned', body: 'Task assigned', isRead: false, createdAt: new Date(),
};

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockNotificationsService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('GET /notifications — returns paginated notifications', async () => {
    mockNotificationsService.findAll.mockResolvedValue({
      data: [mockNotification],
      meta: { total: 1, unreadCount: 1, page: 1, pageSize: 20, totalPages: 1 },
    });
    const result = await controller.findAll({}, adminActor as never);
    expect(result.data).toHaveLength(1);
    expect(result.meta.unreadCount).toBe(1);
  });

  it('POST /notifications/:id/read — marks notification read', async () => {
    mockNotificationsService.markRead.mockResolvedValue(undefined);
    await controller.markRead('notif-1', adminActor as never);
    expect(mockNotificationsService.markRead).toHaveBeenCalledWith('notif-1', 'user-1');
  });

  it('POST /notifications/read-all — marks all read', async () => {
    mockNotificationsService.markAllRead.mockResolvedValue(undefined);
    await controller.markAllRead(adminActor as never);
    expect(mockNotificationsService.markAllRead).toHaveBeenCalledWith('user-1');
  });
});
