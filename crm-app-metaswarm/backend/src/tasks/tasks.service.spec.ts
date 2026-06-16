import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationType, RoleName, TaskStatus, TaskType } from '@prisma/client';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  task: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  customer: { findFirst: jest.fn() },
  opportunity: { findFirst: jest.fn() },
  notification: { create: jest.fn() },
  auditLog: { create: jest.fn() },
};

const ADMIN = RoleName.SYSTEM_ADMINISTRATOR;
const MANAGER = RoleName.SALES_MANAGER;
const REP = RoleName.SALES_REPRESENTATIVE;
const SUPPORT = RoleName.SUPPORT_REPRESENTATIVE;

const mockCustomer = { id: 'cust-1', companyName: 'Acme' };
const mockOpportunity = { id: 'opp-1', name: 'Big Deal' };

const pastDate = new Date(Date.now() - 86400000); // yesterday
const futureDate = new Date(Date.now() + 86400000); // tomorrow

const mockTask = {
  id: 'task-1', type: TaskType.FOLLOW_UP, title: 'Follow up call', description: null,
  status: TaskStatus.OPEN, dueDate: futureDate, completedAt: null, cancelledAt: null,
  assigneeId: 'user-1', createdById: 'user-1', customerId: 'cust-1', opportunityId: null,
  createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  assignee: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
  createdBy: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
  customer: { id: 'cust-1', companyName: 'Acme' },
  opportunity: null,
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<TasksService>(TasksService);
  });

  describe('findAll', () => {
    it('returns paginated tasks for admin', async () => {
      mockPrisma.task.findMany.mockResolvedValue([mockTask]);
      mockPrisma.task.count.mockResolvedValue(1);
      const result = await service.findAll({}, 'user-1', ADMIN, []);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('scopes to assigned tasks for SALES_REPRESENTATIVE', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);
      await service.findAll({}, 'user-1', REP, []);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ assigneeId: 'user-1' }) }),
      );
    });

    it('scopes to assigned tasks for SUPPORT_REPRESENTATIVE', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);
      await service.findAll({}, 'user-1', SUPPORT, []);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ assigneeId: 'user-1' }) }),
      );
    });

    it('filters by status', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);
      await service.findAll({ status: TaskStatus.OPEN }, 'user-1', ADMIN, []);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: TaskStatus.OPEN }) }),
      );
    });

    it('filters overdue tasks', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);
      await service.findAll({ overdue: true }, 'user-1', ADMIN, []);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TaskStatus.OPEN,
            dueDate: expect.objectContaining({ lt: expect.any(Date) }),
          }),
        }),
      );
    });

    it('adds isOverdue computed property', async () => {
      const overdueTask = { ...mockTask, dueDate: pastDate, status: TaskStatus.OPEN };
      mockPrisma.task.findMany.mockResolvedValue([overdueTask]);
      mockPrisma.task.count.mockResolvedValue(1);
      const result = await service.findAll({}, 'user-1', ADMIN, []);
      expect((result.data[0] as { isOverdue: boolean }).isOverdue).toBe(true);
    });
  });

  describe('findOne', () => {
    it('returns task with isOverdue for admin', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      const result = await service.findOne('task-1', 'user-1', ADMIN, []);
      expect(result.id).toBe('task-1');
    });

    it('throws NotFoundException when task not found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);
      await expect(service.findOne('bad', 'user-1', ADMIN, [])).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for REP accessing another users task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, createdById: 'other', assigneeId: 'other' });
      await expect(service.findOne('task-1', 'user-1', REP, [])).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('creates task with actor as assignee by default', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.task.create.mockResolvedValue(mockTask);
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      const result = await service.create(
        { type: TaskType.FOLLOW_UP, title: 'Call', dueDate: futureDate, customerId: 'cust-1' },
        'user-1', ADMIN, [],
      );
      expect(result.id).toBe('task-1');
      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ assigneeId: 'user-1', createdById: 'user-1' }) }),
      );
    });

    it('validates customer when customerId provided', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ type: TaskType.CALL, title: 'X', dueDate: futureDate, customerId: 'bad' }, 'user-1', ADMIN, []),
      ).rejects.toThrow(NotFoundException);
    });

    it('validates opportunity when opportunityId provided', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ type: TaskType.CALL, title: 'X', dueDate: futureDate, opportunityId: 'bad' }, 'user-1', ADMIN, []),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates TASK_ASSIGNED notification when assignee differs from creator', async () => {
      mockPrisma.task.create.mockResolvedValue({ ...mockTask, assigneeId: 'user-2', createdById: 'user-1' });
      mockPrisma.notification.create.mockResolvedValue(undefined);
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      await service.create(
        { type: TaskType.FOLLOW_UP, title: 'X', dueDate: futureDate, assigneeId: 'user-2' },
        'user-1', ADMIN, [],
      );
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: NotificationType.TASK_ASSIGNED, userId: 'user-2' }),
        }),
      );
    });

    it('does not create notification when assignee is creator', async () => {
      mockPrisma.task.create.mockResolvedValue(mockTask);
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      await service.create(
        { type: TaskType.FOLLOW_UP, title: 'X', dueDate: futureDate },
        'user-1', ADMIN, [],
      );
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('allows assignee to update task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, title: 'Updated' });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      const result = await service.update('task-1', { title: 'Updated' }, 'user-1', REP, []);
      expect(result.title).toBe('Updated');
    });

    it('allows creator to update task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, assigneeId: 'user-2' });
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, title: 'Updated' });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      const result = await service.update('task-1', { title: 'Updated' }, 'user-1', REP, []);
      expect(result.title).toBe('Updated');
    });

    it('throws ForbiddenException when neither creator nor assignee', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, createdById: 'other', assigneeId: 'other' });
      await expect(service.update('task-1', { title: 'X' }, 'user-1', REP, [])).rejects.toThrow(ForbiddenException);
    });
  });

  describe('complete', () => {
    it('completes an OPEN task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, status: TaskStatus.COMPLETED, completedAt: new Date() });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      const result = await service.complete('task-1', 'user-1', REP, []);
      expect(result.status).toBe(TaskStatus.COMPLETED);
    });

    it('throws ConflictException when task is not OPEN', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, status: TaskStatus.COMPLETED });
      await expect(service.complete('task-1', 'user-1', REP, [])).rejects.toThrow(ConflictException);
    });
  });

  describe('cancel', () => {
    it('cancels an OPEN task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, status: TaskStatus.CANCELLED, cancelledAt: new Date() });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      const result = await service.cancel('task-1', 'user-1', REP, []);
      expect(result.status).toBe(TaskStatus.CANCELLED);
    });

    it('throws ConflictException when task is not OPEN', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, status: TaskStatus.CANCELLED });
      await expect(service.cancel('task-1', 'user-1', REP, [])).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('soft-deletes task as creator', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, deletedAt: new Date() });
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
      await service.remove('task-1', 'user-1', REP, []);
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
      );
    });

    it('throws ForbiddenException when neither creator nor assignee', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ ...mockTask, createdById: 'other', assigneeId: 'other' });
      await expect(service.remove('task-1', 'user-1', REP, [])).rejects.toThrow(ForbiddenException);
    });
  });
});
