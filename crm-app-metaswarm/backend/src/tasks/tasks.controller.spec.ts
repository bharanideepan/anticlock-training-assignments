import { Test, TestingModule } from '@nestjs/testing';
import { RoleName, TaskStatus, TaskType } from '@prisma/client';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockTasksService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  complete: jest.fn(),
  cancel: jest.fn(),
  remove: jest.fn(),
};

const adminActor = { sub: 'user-1', email: 'a@b.com', role: RoleName.SYSTEM_ADMINISTRATOR, teamIds: [] as string[] };

const mockTask = {
  id: 'task-1', type: TaskType.FOLLOW_UP, title: 'Follow up', status: TaskStatus.OPEN,
  dueDate: new Date(), isOverdue: false, assigneeId: 'user-1', createdById: 'user-1',
  assignee: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
  createdBy: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
  customer: null, opportunity: null,
};

describe('TasksController', () => {
  let controller: TasksController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: mockTasksService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<TasksController>(TasksController);
  });

  it('GET /tasks — returns paginated list', async () => {
    mockTasksService.findAll.mockResolvedValue({ data: [mockTask], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } });
    const result = await controller.findAll({}, adminActor as never);
    expect(result.data).toHaveLength(1);
  });

  it('POST /tasks — returns 201 envelope', async () => {
    mockTasksService.create.mockResolvedValue(mockTask);
    const dto = { type: TaskType.FOLLOW_UP, title: 'Call', dueDate: new Date() };
    const result = await controller.create(dto as never, adminActor as never);
    expect(result).toEqual({ data: mockTask });
  });

  it('GET /tasks/:id — returns { data }', async () => {
    mockTasksService.findOne.mockResolvedValue(mockTask);
    const result = await controller.findOne('task-1', adminActor as never);
    expect(result).toEqual({ data: mockTask });
  });

  it('PATCH /tasks/:id — returns updated { data }', async () => {
    const updated = { ...mockTask, title: 'Updated' };
    mockTasksService.update.mockResolvedValue(updated);
    const result = await controller.update('task-1', { title: 'Updated' }, adminActor as never);
    expect(result).toEqual({ data: updated });
  });

  it('POST /tasks/:id/complete — returns completed task', async () => {
    const completed = { ...mockTask, status: TaskStatus.COMPLETED };
    mockTasksService.complete.mockResolvedValue(completed);
    const result = await controller.complete('task-1', adminActor as never);
    expect(result).toEqual({ data: completed });
  });

  it('POST /tasks/:id/cancel — returns cancelled task', async () => {
    const cancelled = { ...mockTask, status: TaskStatus.CANCELLED };
    mockTasksService.cancel.mockResolvedValue(cancelled);
    const result = await controller.cancel('task-1', adminActor as never);
    expect(result).toEqual({ data: cancelled });
  });

  it('DELETE /tasks/:id — calls remove and returns void', async () => {
    mockTasksService.remove.mockResolvedValue(undefined);
    await controller.remove('task-1', adminActor as never);
    expect(mockTasksService.remove).toHaveBeenCalledWith('task-1', adminActor.sub, adminActor.role, adminActor.teamIds);
  });
});
