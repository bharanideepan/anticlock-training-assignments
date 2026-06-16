import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, NotificationType, RoleName, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';

const TASK_INCLUDE = {
  assignee: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  customer: { select: { id: true, companyName: true } },
  opportunity: { select: { id: true, name: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryTasksDto,
    actorId: string,
    actorRole: RoleName,
    _actorTeamIds: string[],
  ) {
    void _actorTeamIds;
    const {
      page = 1, pageSize = 20, status, type, assigneeId, customerId, opportunityId,
      overdue, dueDateFrom, dueDateTo, sortBy, sortOrder = 'asc',
    } = query;

    const where: Record<string, unknown> = {};

    if (status) where['status'] = status;
    if (type) where['type'] = type;
    if (customerId) where['customerId'] = customerId;
    if (opportunityId) where['opportunityId'] = opportunityId;

    if (overdue) {
      where['status'] = TaskStatus.OPEN;
      where['dueDate'] = { lt: new Date() };
    } else {
      if (dueDateFrom || dueDateTo) {
        where['dueDate'] = {};
        if (dueDateFrom) (where['dueDate'] as Record<string, unknown>)['gte'] = new Date(dueDateFrom);
        if (dueDateTo) (where['dueDate'] as Record<string, unknown>)['lte'] = new Date(dueDateTo);
      }
    }

    if (actorRole === RoleName.SALES_REPRESENTATIVE || actorRole === RoleName.SUPPORT_REPRESENTATIVE) {
      where['assigneeId'] = actorId;
    } else if (assigneeId) {
      where['assigneeId'] = assigneeId;
    }

    const orderBy = { [sortBy ?? 'dueDate']: sortOrder };
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({ where, include: TASK_INCLUDE, orderBy, skip, take }),
      this.prisma.task.count({ where }),
    ]);

    const now = new Date();
    const data = tasks.map((t) => ({
      ...t,
      isOverdue: t.status === TaskStatus.OPEN && t.dueDate < now,
    }));

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string, actorId: string, actorRole: RoleName, _actorTeamIds: string[]) {
    void _actorTeamIds;
    const task = await this.prisma.task.findFirst({
      where: { id },
      include: TASK_INCLUDE,
    });

    if (!task) {
      throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Task not found' });
    }

    this.assertReadAccess(task, actorId, actorRole);

    const now = new Date();
    return { ...task, isOverdue: task.status === TaskStatus.OPEN && task.dueDate < now };
  }

  async create(
    dto: CreateTaskDto,
    actorId: string,
    _actorRole: RoleName,
    _actorTeamIds: string[],
  ) {
    void _actorRole; void _actorTeamIds;

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId } });
      if (!customer) {
        throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });
      }
    }

    if (dto.opportunityId) {
      const opp = await this.prisma.opportunity.findFirst({ where: { id: dto.opportunityId } });
      if (!opp) {
        throw new NotFoundException({ code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunity not found' });
      }
    }

    const assigneeId = dto.assigneeId ?? actorId;

    const task = await this.prisma.task.create({
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate,
        assigneeId,
        createdById: actorId,
        customerId: dto.customerId ?? null,
        opportunityId: dto.opportunityId ?? null,
      },
      include: TASK_INCLUDE,
    });

    if (assigneeId !== actorId) {
      await this.prisma.notification.create({
        data: {
          type: NotificationType.TASK_ASSIGNED,
          userId: assigneeId,
          title: 'New task assigned',
          body: `You have been assigned a task: ${task.title}`,
          resourceType: 'Task',
          resourceId: task.id,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_CREATED, resourceType: 'Task', resourceId: task.id },
    });

    const now = new Date();
    return { ...task, isOverdue: task.status === TaskStatus.OPEN && task.dueDate < now };
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    const task = await this.findOne(id, actorId, actorRole, actorTeamIds);

    this.assertWriteAccess(task, actorId, actorRole);

    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: { ...dto },
      include: TASK_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_UPDATED, resourceType: 'Task', resourceId: id },
    });

    const now = new Date();
    return { ...updated, isOverdue: updated.status === TaskStatus.OPEN && updated.dueDate < now };
  }

  async complete(id: string, actorId: string, actorRole: RoleName, actorTeamIds: string[]) {
    const task = await this.findOne(id, actorId, actorRole, actorTeamIds);

    this.assertWriteAccess(task, actorId, actorRole);

    if (task.status !== TaskStatus.OPEN) {
      throw new ConflictException({ code: 'TASK_NOT_OPEN', message: 'Only OPEN tasks can be completed' });
    }

    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.COMPLETED, completedAt: new Date() },
      include: TASK_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_UPDATED, resourceType: 'Task', resourceId: id },
    });

    return { ...updated, isOverdue: false };
  }

  async cancel(id: string, actorId: string, actorRole: RoleName, actorTeamIds: string[]) {
    const task = await this.findOne(id, actorId, actorRole, actorTeamIds);

    this.assertWriteAccess(task, actorId, actorRole);

    if (task.status !== TaskStatus.OPEN) {
      throw new ConflictException({ code: 'TASK_NOT_OPEN', message: 'Only OPEN tasks can be cancelled' });
    }

    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.CANCELLED, cancelledAt: new Date() },
      include: TASK_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_UPDATED, resourceType: 'Task', resourceId: id },
    });

    return { ...updated, isOverdue: false };
  }

  async remove(id: string, actorId: string, actorRole: RoleName, actorTeamIds: string[]) {
    const task = await this.findOne(id, actorId, actorRole, actorTeamIds);

    this.assertWriteAccess(task, actorId, actorRole);

    await this.prisma.task.update({
      where: { id: task.id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_DELETED, resourceType: 'Task', resourceId: id },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertReadAccess(
    task: { createdById: string; assigneeId: string },
    actorId: string,
    actorRole: RoleName,
  ) {
    if (actorRole === RoleName.SYSTEM_ADMINISTRATOR || actorRole === RoleName.SALES_MANAGER) return;
    if (task.createdById !== actorId && task.assigneeId !== actorId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
    }
  }

  private assertWriteAccess(
    task: { createdById: string; assigneeId: string },
    actorId: string,
    actorRole: RoleName,
  ) {
    if (actorRole === RoleName.SYSTEM_ADMINISTRATOR || actorRole === RoleName.SALES_MANAGER) return;
    if (task.createdById !== actorId && task.assigneeId !== actorId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only the task creator or assignee can modify it' });
    }
  }
}
