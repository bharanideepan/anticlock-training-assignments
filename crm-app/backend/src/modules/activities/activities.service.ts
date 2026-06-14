import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import { VisibilityFilter } from '../../common/guards/visibility.guard';
import { paginate } from '../../common/pagination/paginated-result';

const ACTIVITY_SELECT = {
  id: true,
  type: true,
  subject: true,
  description: true,
  scheduledAt: true,
  durationMinutes: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, companyName: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildVisibilityWhere(visibility: VisibilityFilter) {
    if (visibility.ownerId)
      return { customer: { ownerId: visibility.ownerId } };
    if (visibility.ownerIdIn)
      return { customer: { ownerId: { in: visibility.ownerIdIn } } };
    return {};
  }

  async findAll(filter: ActivityFilterDto, visibility: VisibilityFilter) {
    const where: any = { ...this.buildVisibilityWhere(visibility) };
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.contactId) where.contactId = filter.contactId;
    if (filter.type) where.type = filter.type;
    if (filter.createdById) where.createdById = filter.createdById;
    if (filter.fromDate || filter.toDate) {
      where.scheduledAt = {};
      if (filter.fromDate) where.scheduledAt.gte = new Date(filter.fromDate);
      if (filter.toDate) where.scheduledAt.lte = new Date(filter.toDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        select: ACTIVITY_SELECT,
        orderBy: { [filter.sortBy ?? 'scheduledAt']: filter.sortOrder },
        skip: filter.skip,
        take: filter.pageSize,
      }),
      this.prisma.activity.count({ where }),
    ]);
    return paginate(data, total, filter.page, filter.pageSize);
  }

  async findOne(id: string, visibility: VisibilityFilter) {
    const where: any = { id, ...this.buildVisibilityWhere(visibility) };
    const activity = await this.prisma.activity.findFirst({
      where,
      select: {
        ...ACTIVITY_SELECT,
      },
    });
    if (!activity) throw new NotFoundException('ACTIVITY_NOT_FOUND');
    return activity;
  }

  async create(
    dto: CreateActivityDto,
    actorId: string,
    visibility: VisibilityFilter,
  ) {
    // Verify customer in visibility scope
    const visWhere: any = {
      id: dto.customerId,
      ...this.buildVisibilityWhere(visibility),
    };
    const customer = await this.prisma.customer.findFirst({ where: visWhere });
    if (!customer) throw new NotFoundException('CUSTOMER_NOT_FOUND');

    if (dto.contactId) {
      const contact = await this.prisma.contact.findUnique({
        where: { id: dto.contactId },
      });
      if (!contact) throw new NotFoundException('CONTACT_NOT_FOUND');
      if (contact.customerId !== dto.customerId)
        throw new ConflictException('CONTACT_NOT_LINKED_TO_CUSTOMER');
    }

    return this.prisma.activity.create({
      data: {
        type: dto.type,
        subject: dto.subject,
        description: dto.description,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        durationMinutes: dto.durationMinutes,
        customerId: dto.customerId,
        contactId: dto.contactId,
        createdById: actorId,
      },
      select: ACTIVITY_SELECT,
    });
  }

  async update(
    id: string,
    dto: UpdateActivityDto,
    actorId: string,
    isAdmin: boolean,
    visibility: VisibilityFilter,
  ) {
    const activity = await this.findOne(id, visibility);
    if (!isAdmin && (activity as any).createdBy?.id !== actorId) {
      throw new ForbiddenException('NOT_ACTIVITY_OWNER');
    }

    return this.prisma.activity.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
      select: ACTIVITY_SELECT,
    });
  }

  async remove(
    id: string,
    actorId: string,
    isAdmin: boolean,
    visibility: VisibilityFilter,
  ) {
    const activity = await this.findOne(id, visibility);
    if (!isAdmin && (activity as any).createdBy?.id !== actorId) {
      throw new ForbiddenException('NOT_ACTIVITY_OWNER');
    }
    await this.prisma.activity.delete({ where: { id } });
  }
}
