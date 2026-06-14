import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CustomerStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerStatusDto } from './dto/customer-status.dto';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import { VisibilityFilter } from '../../common/guards/visibility.guard';
import { paginate } from '../../common/pagination/paginated-result';
import { PageOptionsDto } from '../../common/pagination/page-options.dto';

const CUSTOMER_SELECT = {
  id: true,
  companyName: true,
  industry: true,
  website: true,
  revenueRange: true,
  status: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  country: true,
  postalCode: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, firstName: true, lastName: true } },
} as const;

const VALID_TRANSITIONS: Record<CustomerStatus, CustomerStatus[]> = {
  PROSPECT: ['ACTIVE', 'INACTIVE'],
  ACTIVE: ['INACTIVE'],
  INACTIVE: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: [],
};

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  private buildVisibilityWhere(visibility: VisibilityFilter) {
    if (visibility.ownerId) return { ownerId: visibility.ownerId };
    if (visibility.ownerIdIn) return { ownerId: { in: visibility.ownerIdIn } };
    return {};
  }

  async findAll(filter: CustomerFilterDto, visibility: VisibilityFilter) {
    const where: any = { ...this.buildVisibilityWhere(visibility) };

    if (filter.search) {
      where.OR = [
        { companyName: { contains: filter.search, mode: 'insensitive' } },
        { website: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    if (filter.status) where.status = filter.status;
    if (filter.industry)
      where.industry = { equals: filter.industry, mode: 'insensitive' };
    if (filter.ownerId) where.ownerId = filter.ownerId;

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        select: CUSTOMER_SELECT,
        orderBy: { [filter.sortBy ?? 'companyName']: filter.sortOrder },
        skip: filter.skip,
        take: filter.pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return paginate(data, total, filter.page, filter.pageSize);
  }

  async findOne(id: string, visibility: VisibilityFilter) {
    const where: any = { id, ...this.buildVisibilityWhere(visibility) };
    const customer = await this.prisma.customer.findFirst({
      where,
      select: {
        ...CUSTOMER_SELECT,
        _count: {
          select: {
            contacts: true,
            activities: true,
            tasks: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('CUSTOMER_NOT_FOUND');

    // Count open opportunities and files separately (no direct relation on File model)
    const [openOpportunities, files] = await Promise.all([
      this.prisma.opportunity.count({
        where: { customerId: id, actualCloseDate: null },
      }),
      this.prisma.file.count({
        where: { resourceType: 'CUSTOMER', resourceId: id },
      }),
    ]);

    return {
      ...customer,
      _counts: {
        contacts: customer._count.contacts,
        activities: customer._count.activities,
        openOpportunities,
        openTasks: customer._count.tasks,
        files,
      },
      _count: undefined,
    };
  }

  async create(dto: CreateCustomerDto, actorId: string) {
    const ownerId = dto.ownerId ?? actorId;

    const customer = await this.prisma.customer.create({
      data: {
        companyName: dto.companyName,
        industry: dto.industry,
        website: dto.website,
        revenueRange: dto.revenueRange,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
        status: CustomerStatus.PROSPECT,
        ownerId,
      },
      select: CUSTOMER_SELECT,
    });

    return customer;
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    visibility: VisibilityFilter,
  ) {
    await this.findOne(id, visibility);
    return this.prisma.customer.update({
      where: { id },
      data: dto,
      select: CUSTOMER_SELECT,
    });
  }

  async transition(
    id: string,
    dto: CustomerStatusDto,
    visibility: VisibilityFilter,
    isAdmin: boolean,
  ) {
    const customer = await this.findOne(id, visibility);
    const allowed = VALID_TRANSITIONS[customer.status];

    if (!isAdmin && customer.status === CustomerStatus.ARCHIVED) {
      throw new ForbiddenException('ACCESS_DENIED');
    }
    if (!allowed.includes(dto.status)) {
      throw new ConflictException('INVALID_STATUS_TRANSITION');
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { status: dto.status },
      select: CUSTOMER_SELECT,
    });

    if (
      (dto.status === 'INACTIVE' || dto.status === 'ARCHIVED') &&
      (updated as any).owner?.id
    ) {
      await this.notificationsService.createAndSend({
        userId: (updated as any).owner.id,
        type: 'CUSTOMER_UPDATED',
        title: 'Customer status changed',
        body: `Customer "${updated.companyName}" status changed to ${dto.status}.`,
        resourceType: 'CUSTOMER',
        resourceId: id,
      });
    }

    return updated;
  }

  async archive(id: string, visibility: VisibilityFilter) {
    const customer = await this.findOne(id, visibility);
    if (customer.status === CustomerStatus.ARCHIVED) return customer;

    // Close all open opportunities
    await this.prisma.opportunity.updateMany({
      where: { customerId: id, actualCloseDate: null },
      data: { closeNote: 'Customer archived', actualCloseDate: new Date() },
    });

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { status: CustomerStatus.ARCHIVED },
      select: CUSTOMER_SELECT,
    });

    if ((customer as any).owner?.id) {
      await this.notificationsService.createAndSend({
        userId: (customer as any).owner.id,
        type: 'CUSTOMER_UPDATED',
        title: 'Customer archived',
        body: `Customer "${customer.companyName}" has been archived.`,
        resourceType: 'CUSTOMER',
        resourceId: id,
      });
    }

    return updated;
  }

  async unarchive(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('CUSTOMER_NOT_FOUND');
    return this.prisma.customer.update({
      where: { id },
      data: { status: CustomerStatus.INACTIVE },
      select: CUSTOMER_SELECT,
    });
  }

  async getContacts(
    customerId: string,
    opts: PageOptionsDto,
    visibility: VisibilityFilter,
  ) {
    await this.findOne(customerId, visibility);
    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        skip: opts.skip,
        take: opts.pageSize,
      }),
      this.prisma.contact.count({ where: { customerId } }),
    ]);
    return paginate(data, total, opts.page, opts.pageSize);
  }

  async getActivities(
    customerId: string,
    opts: PageOptionsDto & { type?: string },
    visibility: VisibilityFilter,
  ) {
    await this.findOne(customerId, visibility);
    const where: any = { customerId };
    if (opts.type) where.type = opts.type;
    const page = Number(opts.page) || 1;
    const pageSize = Number(opts.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.activity.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async getOpportunities(
    customerId: string,
    opts: PageOptionsDto & { stageId?: string },
    visibility: VisibilityFilter,
  ) {
    await this.findOne(customerId, visibility);
    const where: any = { customerId };
    if (opts.stageId) where.stageId = opts.stageId;
    const page = Number(opts.page) || 1;
    const pageSize = Number(opts.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { stage: true, owner: true },
      }),
      this.prisma.opportunity.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async getTasks(
    customerId: string,
    opts: PageOptionsDto & { status?: string },
    visibility: VisibilityFilter,
  ) {
    await this.findOne(customerId, visibility);
    const where: any = { customerId };
    if (opts.status) where.status = opts.status;
    const page = Number(opts.page) || 1;
    const pageSize = Number(opts.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const now = new Date();
    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip,
        take: pageSize,
        include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.task.count({ where }),
    ]);
    const enriched = data.map((t) => ({ ...t, isOverdue: t.status === 'OPEN' && t.dueDate < now }));
    return paginate(enriched, total, page, pageSize);
  }

  async getFiles(customerId: string, visibility: VisibilityFilter) {
    await this.findOne(customerId, visibility);
    return this.prisma.file.findMany({
      where: { resourceType: 'CUSTOMER', resourceId: customerId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }
}
