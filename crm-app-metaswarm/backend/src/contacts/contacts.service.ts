import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryContactsDto } from './dto/query-contacts.dto';

const CONTACT_INCLUDE = {
  customer: { select: { id: true, companyName: true, ownerId: true } },
  _count: { select: { activities: true, opportunities: true } },
} as const;

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryContactsDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    const { page = 1, pageSize = 20, search, customerId, sortBy, sortOrder = 'asc' } = query;

    const where: Record<string, unknown> = {};

    if (customerId) {
      where['customerId'] = customerId;
    }

    if (search) {
      where['OR'] = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (actorRole === RoleName.SALES_REPRESENTATIVE) {
      where['customer'] = { ownerId: actorId };
    }

    if (actorRole === RoleName.SALES_MANAGER && actorTeamIds.length > 0) {
      where['customer'] = {
        owner: { teamMemberships: { some: { teamId: { in: actorTeamIds } } } },
      };
    }

    const orderBy = { [sortBy ?? 'createdAt']: sortOrder };
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({ where, include: CONTACT_INCLUDE, orderBy, skip, take }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data: contacts,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(id: string, actorId: string, actorRole: RoleName, actorTeamIds: string[]) {
    void actorTeamIds;
    const contact = await this.prisma.contact.findFirst({
      where: { id },
      include: CONTACT_INCLUDE,
    });

    if (!contact) {
      throw new NotFoundException({ code: 'CONTACT_NOT_FOUND', message: 'Contact not found' });
    }

    this.assertContactVisibility(contact.customer.ownerId, actorId, actorRole);

    return contact;
  }

  async create(
    dto: CreateContactDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    void actorTeamIds;

    // Validate customer exists and is accessible
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId } });

    if (!customer) {
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });
    }

    this.assertContactVisibility(customer.ownerId, actorId, actorRole);

    const { customerId, ...rest } = dto;

    const contact = await this.prisma.contact.create({
      data: { ...rest, customerId },
      include: CONTACT_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_CREATED, resourceType: 'Contact', resourceId: contact.id },
    });

    return contact;
  }

  async update(
    id: string,
    dto: UpdateContactDto,
    actorId: string,
    actorRole: RoleName,
    actorTeamIds: string[],
  ) {
    const contact = await this.findOne(id, actorId, actorRole, actorTeamIds);

    const updated = await this.prisma.contact.update({
      where: { id: contact.id },
      data: dto,
      include: CONTACT_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_UPDATED, resourceType: 'Contact', resourceId: id },
    });

    return updated;
  }

  async remove(id: string, actorId: string, actorRole: RoleName, actorTeamIds: string[]) {
    const contact = await this.findOne(id, actorId, actorRole, actorTeamIds);

    await this.prisma.contact.update({
      where: { id: contact.id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.RECORD_DELETED, resourceType: 'Contact', resourceId: id },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private assertContactVisibility(
    customerOwnerId: string,
    actorId: string,
    actorRole: RoleName,
  ) {
    if (actorRole === RoleName.SALES_REPRESENTATIVE && customerOwnerId !== actorId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
    }
  }
}
