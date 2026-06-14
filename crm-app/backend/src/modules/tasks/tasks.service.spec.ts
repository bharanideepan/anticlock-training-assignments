import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const baseTask = {
  id: 'task-1',
  status: 'OPEN',
  assigneeId: 'user-2',
  createdById: 'user-1',
  dueDate: new Date(Date.now() - 86400_000), // yesterday = overdue
};

describe('TasksService', () => {
  let service: TasksService;
  let prisma: any;
  let notifications: any;

  beforeEach(async () => {
    prisma = {
      task: {
        create: jest.fn().mockResolvedValue({ ...baseTask, id: 'new-task' }),
        findFirst: jest.fn().mockResolvedValue(baseTask),
        update: jest.fn().mockResolvedValue(baseTask),
        findMany: jest.fn().mockResolvedValue([baseTask]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    notifications = { createAndSend: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(TasksService);
  });

  describe('isOverdue computation', () => {
    it('marks task as overdue when dueDate is in the past and status is OPEN', () => {
      const task = {
        ...baseTask,
        status: 'OPEN',
        dueDate: new Date(Date.now() - 1000),
      };
      const result = (service as any).addIsOverdue([task]);
      expect(result[0].isOverdue).toBe(true);
    });

    it('does not mark as overdue when status is COMPLETED', () => {
      const task = {
        ...baseTask,
        status: 'COMPLETED',
        dueDate: new Date(Date.now() - 1000),
      };
      const result = (service as any).addIsOverdue([task]);
      expect(result[0].isOverdue).toBe(false);
    });

    it('does not mark as overdue when dueDate is in the future', () => {
      const task = {
        ...baseTask,
        status: 'OPEN',
        dueDate: new Date(Date.now() + 86400_000),
      };
      const result = (service as any).addIsOverdue([task]);
      expect(result[0].isOverdue).toBe(false);
    });
  });

  describe('complete', () => {
    it('throws ConflictException if task is not OPEN', async () => {
      prisma.task.findFirst.mockResolvedValue({
        ...baseTask,
        status: 'COMPLETED',
      });
      const user = { id: 'user-1', role: 'SALES_REPRESENTATIVE' };
      await expect(service.complete('task-1', user.id, false)).rejects.toThrow(
        ConflictException,
      );
    });

    it('completes an OPEN task successfully', async () => {
      prisma.task.findFirst.mockResolvedValue(baseTask);
      prisma.task.update.mockResolvedValue({
        ...baseTask,
        status: 'COMPLETED',
      });
      const user = { id: 'user-1', role: 'SYSTEM_ADMINISTRATOR' };
      await service.complete('task-1', user.id, true);
      expect(prisma.task.update).toHaveBeenCalled();
    });
  });

  describe('TASK_ASSIGNED notification', () => {
    it('emits TASK_ASSIGNED when assignee differs from creator', async () => {
      const dto = {
        type: 'FOLLOW_UP',
        title: 'Test',
        assigneeId: 'user-2',
      } as any;
      const actor = { id: 'user-1', role: 'SALES_MANAGER' } as any;
      prisma.task.create.mockResolvedValue({
        ...baseTask,
        assigneeId: 'user-2',
      });
      await service.create(dto, actor.id);
      expect(notifications.createAndSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TASK_ASSIGNED',
          recipientId: 'user-2',
        }),
      );
    });

    it('does not emit TASK_ASSIGNED when assignee is creator', async () => {
      const dto = {
        type: 'FOLLOW_UP',
        title: 'Test',
        assigneeId: 'user-1',
      } as any;
      const actor = { id: 'user-1', role: 'SALES_MANAGER' } as any;
      prisma.task.create.mockResolvedValue({
        ...baseTask,
        assigneeId: 'user-1',
      });
      await service.create(dto, actor.id);
      expect(notifications.createAndSend).not.toHaveBeenCalled();
    });
  });
});
