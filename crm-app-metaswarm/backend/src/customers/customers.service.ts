import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, CustomerStatus, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';

const CUSTOMER_INCLUDE = {
  owner: { select: { id: true, firstName: true, lastName: true } },
  _count: {
    select: {
      contacts: true,
      activities: true,
      opportunities: true,
      tasks: true,
    },
  },
} as const;

// Valid status transitions for the updateStatus endpoint (excludes archive/unarchive paths).
const VALID_TRANSITIONS: Partial<Record<CustomerStatus, CustomerStatus[]>> = {
  [CustomerStatus.PROSPECT]: [CustomerStatus.ACTIVE],
  [CustomerStatus.ACTIVE]: [CustomerStatus.INACTIVE],
  [CustomerStatus.INACTIVE]: [CustomerStatus.ACTIVE],
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryCustomersDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    const {
      page = 1,
      pageSize = 20,
      search,
      status,
      industry,
      ownerId,
      sortBy,
      sortOrder = 'asc',
    } = query;

    const where: Record<string, unknown> = {};

    // Default: exclude ARCHIVED unless explicitly requested
    if (status) {
      where['status'] = status;
    } else {
      where['status'] = { not: CustomerStatus.ARCHIVED };
    }

    if (search) {
      where['companyName'] = { contains: search, mode: 'insensitive' };
    }

    if (industry) {
      where['industry'] = { contains: industry, mode: 'insensitive' };
    }

    if (ownerId) {
      where['ownerId'] = ownerId;
    }

    // SALES_REPRESENTATIVE can only see their own customers
    if (actorRole === RoleName.SALES_REPRESENTATIVE) {
      where['ownerId'] = actorId;
    }

    // SALES_MANAGER can see customers owned by members of their teams
    if (actorRole === RoleName.SALES_MANAGER && actorTeamIds.length > 0) {
      where['owner'] = {
        teamMemberships: { some: { teamId: { in: actorTeamIds } } },
      };
    }

    const orderBy = { [sortBy ?? 'createdAt']: sortOrder };
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: CUSTOMER_INCLUDE,
        orderBy,
        skip,
        take,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(
    id: string,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id },
      include: CUSTOMER_INCLUDE,
    });

    if (!customer) {
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });
    }

    this.assertVisibility(customer, actorId, actorRole, actorTeamIds);

    return customer;
  }

  async create(dto: CreateCustomerDto, actorId: string) {
    const { ownerId, ...rest } = dto;

    const customer = await this.prisma.customer.create({
      data: {
        ...rest,
        status: CustomerStatus.PROSPECT,
        ownerId: ownerId ?? actorId,
      },
      include: CUSTOMER_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.RECORD_CREATED,
        resourceType: 'Customer',
        resourceId: customer.id,
      },
    });

    return customer;
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    const existing = await this.findOne(id, actorId, actorRole, actorTeamIds);

    const { ownerId, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (ownerId !== undefined) {
      data['ownerId'] = ownerId;
    }

    const updated = await this.prisma.customer.update({
      where: { id: existing.id },
      data,
      include: CUSTOMER_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        action: ownerId ? AuditAction.OWNERSHIP_CHANGED : AuditAction.RECORD_UPDATED,
        resourceType: 'Customer',
        resourceId: id,
      },
    });

    return updated;
  }

  async updateStatus(
    id: string,
    dto: UpdateStatusDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    const customer = await this.findOne(id, actorId, actorRole, actorTeamIds);

    if (customer.status === CustomerStatus.ARCHIVED) {
      throw new ConflictException({
        code: 'CUSTOMER_ARCHIVED',
        message: 'Archived customers cannot be updated via status endpoint; use unarchive instead',
      });
    }

    const allowed = VALID_TRANSITIONS[customer.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new ConflictException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${customer.status} to ${dto.status}`,
      });
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { status: dto.status },
      include: CUSTOMER_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.STATUS_CHANGED,
        resourceType: 'Customer',
        resourceId: id,
      },
    });

    return updated;
  }

  async archive(id: string, _actorId: string, _actorRole: RoleName) {
    const customer = await this.prisma.customer.findFirst({
      where: { id },
      include: CUSTOMER_INCLUDE,
    });

    if (!customer) {
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });
    }

    if (customer.status === CustomerStatus.ARCHIVED) {
      throw new ConflictException({
        code: 'ALREADY_ARCHIVED',
        message: 'Customer is already archived',
      });
    }

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      // Soft-delete open opportunities for this customer
      await tx.opportunity.updateMany({
        where: { customerId: id, deletedAt: null },
        data: { deletedAt: now },
      });

      return tx.customer.update({
        where: { id },
        data: { status: CustomerStatus.ARCHIVED },
        include: CUSTOMER_INCLUDE,
      });
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.STATUS_CHANGED,
        resourceType: 'Customer',
        resourceId: id,
      },
    });

    return updated;
  }

  async unarchive(id: string, _actorId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id },
      include: CUSTOMER_INCLUDE,
    });

    if (!customer) {
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });
    }

    if (customer.status !== CustomerStatus.ARCHIVED) {
      throw new ConflictException({
        code: 'NOT_ARCHIVED',
        message: 'Customer is not archived',
      });
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { status: CustomerStatus.INACTIVE },
      include: CUSTOMER_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.STATUS_CHANGED,
        resourceType: 'Customer',
        resourceId: id,
      },
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertVisibility(
    customer: { ownerId: string },
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    void actorTeamIds; // team-scoped visibility handled at query level for lists

    if (actorRole === RoleName.SALES_REPRESENTATIVE && customer.ownerId !== actorId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
    }
  }
}
