import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactFilterDto } from './dto/contact-filter.dto';
import { VisibilityFilter } from '../../common/guards/visibility.guard';
import { paginate } from '../../common/pagination/paginated-result';
import { PageOptionsDto } from '../../common/pagination/page-options.dto';

const CONTACT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  designation: true,
  department: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, companyName: true } },
} as const;

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildVisibilityWhere(visibility: VisibilityFilter) {
    if (visibility.ownerId)
      return { customer: { ownerId: visibility.ownerId } };
    if (visibility.ownerIdIn)
      return { customer: { ownerId: { in: visibility.ownerIdIn } } };
    return {};
  }

  async findAll(filter: ContactFilterDto, visibility: VisibilityFilter) {
    const where: any = { ...this.buildVisibilityWhere(visibility) };

    if (filter.search) {
      const s = filter.search;
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (filter.customerId) where.customerId = filter.customerId;

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        select: CONTACT_SELECT,
        orderBy: { [filter.sortBy ?? 'lastName']: filter.sortOrder },
        skip: filter.skip,
        take: filter.pageSize,
      }),
      this.prisma.contact.count({ where }),
    ]);
    return paginate(data, total, filter.page, filter.pageSize);
  }

  async findOne(id: string, visibility: VisibilityFilter) {
    const where: any = { id, ...this.buildVisibilityWhere(visibility) };
    const contact = await this.prisma.contact.findFirst({
      where,
      select: {
        ...CONTACT_SELECT,
        _count: { select: { activities: true, opportunities: true } },
      },
    });
    if (!contact) throw new NotFoundException('CONTACT_NOT_FOUND');
    return { ...contact, _counts: contact._count, _count: undefined };
  }

  async create(dto: CreateContactDto, visibility: VisibilityFilter) {
    // Verify customer is in visibility scope
    const visWhere: any = {
      id: dto.customerId,
      ...this.buildVisibilityWhere(visibility),
    };
    const customer = await this.prisma.customer.findFirst({ where: visWhere });
    if (!customer)
      throw new ForbiddenException('CUSTOMER_NOT_IN_VISIBILITY_SCOPE');

    return this.prisma.contact.create({
      data: dto,
      select: CONTACT_SELECT,
    });
  }

  async update(
    id: string,
    dto: UpdateContactDto,
    visibility: VisibilityFilter,
  ) {
    await this.findOne(id, visibility);
    return this.prisma.contact.update({
      where: { id },
      data: dto,
      select: CONTACT_SELECT,
    });
  }

  async remove(id: string, visibility: VisibilityFilter) {
    await this.findOne(id, visibility);
    await this.prisma.contact.delete({ where: { id } });
  }

  async getActivities(
    id: string,
    opts: PageOptionsDto & { type?: string },
    visibility: VisibilityFilter,
  ) {
    await this.findOne(id, visibility);
    const where: any = { contactId: id };
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
}
