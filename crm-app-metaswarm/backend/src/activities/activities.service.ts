import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { QueryActivitiesDto } from './dto/query-activities.dto';

const ACTIVITY_INCLUDE = {
  customer: { select: { id: true, companyName: true, ownerId: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryActivitiesDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    void actorTeamIds;
    const { page = 1, pageSize = 20, type, customerId, contactId, createdById, fromDate, toDate, sortBy, sortOrder = 'desc' } = query;

    const where: Record<string, unknown> = {};

    if (type) where['type'] = type;
    if (customerId) where['customerId'] = customerId;
    if (contactId) where['contactId'] = contactId;
    if (createdById) where['createdById'] = createdById;

    if (fromDate || toDate) {
      where['createdAt'] = {};
      if (fromDate) (where['createdAt'] as Record<string, unknown>)['gte'] = new Date(fromDate);
      if (toDate) (where['createdAt'] as Record<string, unknown>)['lte'] = new Date(toDate);
    }

    if (actorRole === RoleName.SALES_REPRESENTATIVE) {
      where['createdById'] = actorId;
    }

    if (actorRole === RoleName.SUPPORT_REPRESENTATIVE) {
      where['createdById'] = actorId;
    }

    const orderBy = { [sortBy ?? 'createdAt']: sortOrder };
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({ where, include: ACTIVITY_INCLUDE, orderBy, skip, take }),
      this.prisma.activity.count({ where }),
    ]);

    return { data: activities, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string, actorId: string, actorRole: RoleName, actorTeamIds: string[]) {
    void actorId; void actorTeamIds;
    const activity = await this.prisma.activity.findFirst({
      where: { id },
      include: ACTIVITY_INCLUDE,
    });

    if (!activity) {
      throw new NotFoundException({ code: 'ACTIVITY_NOT_FOUND', message: 'Activity not found' });
    }

    this.assertReadAccess(activity, actorId, actorRole);

    return activity;
  }

  async create(
    dto: CreateActivityDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    void actorRole; void actorTeamIds;

    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId } });
    if (!customer) {
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });
    }

    if (dto.contactId) {
      const contact = await this.prisma.contact.findFirst({ where: { id: dto.contactId } });
      if (!contact) {
        throw new NotFoundException({ code: 'CONTACT_NOT_FOUND', message: 'Contact not found' });
      }
      if (contact.customerId !== dto.customerId) {
        throw new ConflictException({
          code: 'CONTACT_NOT_LINKED_TO_CUSTOMER',
          message: 'Contact does not belong to the specified customer',
        });
      }
    }

    const { customerId, contactId, scheduledAt, ...rest } = dto;

    const activity = await this.prisma.activity.create({
      data: {
        ...rest,
        customerId,
        contactId: contactId ?? null,
        createdById: actorId,
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
      },
      include: ACTIVITY_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_CREATED, resourceType: 'Activity', resourceId: activity.id },
    });

    return activity;
  }

  async update(
    id: string,
    dto: UpdateActivityDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    const activity = await this.findOne(id, actorId, actorRole, actorTeamIds);

    this.assertWriteAccess(activity, actorId, actorRole);

    const { scheduledAt, contactId, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (scheduledAt !== undefined) data['scheduledAt'] = new Date(scheduledAt);
    if (contactId !== undefined) data['contactId'] = contactId;

    const updated = await this.prisma.activity.update({
      where: { id: activity.id },
      data,
      include: ACTIVITY_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_UPDATED, resourceType: 'Activity', resourceId: id },
    });

    return updated;
  }

  async remove(id: string, actorId: string, actorRole: RoleName, actorTeamIds: string[]) {
    const activity = await this.findOne(id, actorId, actorRole, actorTeamIds);

    this.assertWriteAccess(activity, actorId, actorRole);

    await this.prisma.activity.update({
      where: { id: activity.id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_DELETED, resourceType: 'Activity', resourceId: id },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertReadAccess(
    activity: { createdById: string; customer: { ownerId: string } },
    actorId: string,
    actorRole: RoleName,
  ) {
    if (actorRole === RoleName.SYSTEM_ADMINISTRATOR || actorRole === RoleName.SALES_MANAGER) return;
    // REP and SUPPORT can only see activities they created or are for customers they own
    if (actorRole === RoleName.SALES_REPRESENTATIVE) {
      if (activity.createdById !== actorId && activity.customer.ownerId !== actorId) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
      }
    }
  }

  private assertWriteAccess(
    activity: { createdById: string },
    actorId: string,
    actorRole: RoleName,
  ) {
    if (actorRole === RoleName.SYSTEM_ADMINISTRATOR) return;
    if (activity.createdById !== actorId) {
      throw new ForbiddenException({ code: 'NOT_ACTIVITY_OWNER', message: 'Only the activity creator can modify it' });
    }
  }
}
