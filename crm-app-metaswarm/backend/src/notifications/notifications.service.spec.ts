import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  notification: {
    findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(),
    update: jest.fn(), updateMany: jest.fn(),
  },
};

const mockNotification = {
  id: 'notif-1', userId: 'user-1', type: NotificationType.TASK_ASSIGNED,
  title: 'New task assigned', body: 'You have been assigned a task',
  resourceType: 'Task', resourceId: 'task-1', isRead: false,
  readAt: null, createdAt: new Date(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('findAll', () => {
    it('returns paginated notifications for user', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);
      mockPrisma.notification.count.mockResolvedValue(1);
      const result = await service.findAll('user-1', { page: 1, pageSize: 20, unreadOnly: false });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.unreadCount).toBeDefined();
    });

    it('filters unread when unreadOnly=true', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);
      await service.findAll('user-1', { page: 1, pageSize: 20, unreadOnly: true });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isRead: false }) }),
      );
    });

    it('scopes to authenticated user', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);
      await service.findAll('user-1', { page: 1, pageSize: 20, unreadOnly: false });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
      );
    });
  });

  describe('markRead', () => {
    it('marks a notification as read for the owner', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(mockNotification);
      mockPrisma.notification.update.mockResolvedValue({ ...mockNotification, isRead: true });
      await service.markRead('notif-1', 'user-1');
      expect(mockPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isRead: true }) }),
      );
    });

    it('throws NotFoundException when notification not found', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      await expect(service.markRead('bad', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when not the owner', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({ ...mockNotification, userId: 'other-user' });
      await expect(service.markRead('notif-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAllRead', () => {
    it('marks all unread notifications for user as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });
      await service.markAllRead('user-1');
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', isRead: false }),
          data: expect.objectContaining({ isRead: true }),
        }),
      );
    });
  });
});
