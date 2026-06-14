import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFilterDto } from './dto/task-filter.dto';
import { VisibilityFilter } from '../../common/guards/visibility.guard';
import { paginate } from '../../common/pagination/paginated-result';

const TASK_SELECT = {
  id: true,
  type: true,
  title: true,
  description: true,
  status: true,
  dueDate: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  customer: { select: { id: true, companyName: true } },
  opportunity: { select: { id: true, name: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private buildVisibilityWhere(visibility: VisibilityFilter) {
    if (visibility.ownerId) {
      return {
        OR: [
          { assigneeId: visibility.ownerId },
          { createdById: visibility.ownerId },
        ],
      };
    }
    if (visibility.ownerIdIn) {
      return {
        OR: [
          { assigneeId: { in: visibility.ownerIdIn } },
          { createdById: { in: visibility.ownerIdIn } },
        ],
      };
    }
    return {};
  }

  private addIsOverdue(task: any) {
    const isOverdue =
      task.status === 'OPEN' &&
      task.dueDate !== null &&
      task.dueDate !== undefined &&
      new Date(task.dueDate) < new Date();
    return { ...task, isOverdue };
  }

  async findAll(filter: TaskFilterDto, visibility: VisibilityFilter) {
    const where: any = { ...this.buildVisibilityWhere(visibility) };

    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;
    if (filter.assigneeId) where.assigneeId = filter.assigneeId;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.opportunityId) where.opportunityId = filter.opportunityId;

    if (filter.overdue) {
      where.status = 'OPEN';
      where.dueDate = { lt: new Date() };
    }

    if (filter.dueDateFrom || filter.dueDateTo) {
      where.dueDate = where.dueDate ?? {};
      if (filter.dueDateFrom) where.dueDate.gte = new Date(filter.dueDateFrom);
      if (filter.dueDateTo) where.dueDate.lte = new Date(filter.dueDateTo);
    }

    const sortBy = filter.sortBy ?? 'dueDate';
    const sortOrder = filter.sortOrder ?? 'asc';

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        select: TASK_SELECT,
        orderBy: { [sortBy]: sortOrder },
        skip: filter.skip,
        take: filter.pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return paginate(
      data.map((t) => this.addIsOverdue(t)),
      total,
      filter.page,
      filter.pageSize,
    );
  }

  async findOne(id: string, visibility: VisibilityFilter) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: TASK_SELECT,
    });
    if (!task) throw new NotFoundException('Task not found');
    this.checkVisibility(task, visibility);
    return this.addIsOverdue(task);
  }

  async create(dto: CreateTaskDto, actorId: string) {
    const assigneeId = dto.assigneeId ?? actorId;

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer) throw new NotFoundException('Customer not found');
    }
    if (dto.opportunityId) {
      const opp = await this.prisma.opportunity.findUnique({
        where: { id: dto.opportunityId },
      });
      if (!opp) throw new NotFoundException('Opportunity not found');
    }

    const task = await this.prisma.task.create({
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(),
        assigneeId,
        createdById: actorId,
        customerId: dto.customerId,
        opportunityId: dto.opportunityId,
      },
      select: TASK_SELECT,
    });

    if (assigneeId !== actorId) {
      await this.notificationsService.createAndSend({
        userId: assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'New task assigned to you',
        body: `You have been assigned "${task.title}".`,
        resourceType: 'TASK',
        resourceId: task.id,
      });
    }

    return this.addIsOverdue(task);
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    actorId: string,
    isAdmin: boolean,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: { id: true, createdById: true, assigneeId: true, status: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    this.checkEditPermission(task, actorId, isAdmin);

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
        ...(dto.customerId !== undefined && { customerId: dto.customerId }),
        ...(dto.opportunityId !== undefined && {
          opportunityId: dto.opportunityId,
        }),
      },
      select: TASK_SELECT,
    });
    return this.addIsOverdue(updated);
  }

  async complete(id: string, actorId: string, isAdmin: boolean) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: { id: true, createdById: true, assigneeId: true, status: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'OPEN') throw new ConflictException('TASK_NOT_OPEN');
    this.checkEditPermission(task, actorId, isAdmin);

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
      select: TASK_SELECT,
    });
    return this.addIsOverdue(updated);
  }

  async cancel(id: string, actorId: string, isAdmin: boolean) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: { id: true, createdById: true, assigneeId: true, status: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== 'OPEN') throw new ConflictException('TASK_NOT_OPEN');
    this.checkEditPermission(task, actorId, isAdmin);

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      select: TASK_SELECT,
    });
    return this.addIsOverdue(updated);
  }

  private checkVisibility(task: any, visibility: VisibilityFilter) {
    if (!visibility.ownerId && !visibility.ownerIdIn) return;
    const ids =
      visibility.ownerIdIn ?? (visibility.ownerId ? [visibility.ownerId] : []);
    const hasAccess =
      ids.includes(task.assignee?.id) || ids.includes(task.createdBy?.id);
    if (!hasAccess) throw new ForbiddenException('Access denied');
  }

  private checkEditPermission(
    task: { createdById: string; assigneeId: string | null },
    actorId: string,
    isAdmin: boolean,
  ) {
    if (isAdmin) return;
    if (task.createdById !== actorId && task.assigneeId !== actorId) {
      throw new ForbiddenException(
        'Only the creator or assignee can modify this task',
      );
    }
  }
}
