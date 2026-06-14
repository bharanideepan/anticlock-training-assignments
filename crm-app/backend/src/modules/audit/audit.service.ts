import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditFilterDto } from './dto/audit-filter.dto';
import { paginate } from '../../common/pagination/paginated-result';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: AuditFilterDto) {
    const where: any = {};
    if (filter.actorId) where.actorId = filter.actorId;
    if (filter.resourceType) where.resourceType = filter.resourceType;
    if (filter.resourceId) where.resourceId = filter.resourceId;
    if (filter.action) where.action = filter.action;
    if (filter.fromDate || filter.toDate) {
      where.createdAt = {};
      if (filter.fromDate) where.createdAt.gte = new Date(filter.fromDate);
      if (filter.toDate) where.createdAt.lte = new Date(filter.toDate);
    }

    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: sortOrder },
        skip: filter.skip,
        take: filter.pageSize,
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          previousValue: true,
          newValue: true,
          ipAddress: true,
          traceId: true,
          createdAt: true,
          actorId: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(data, total, filter.page, filter.pageSize);
  }
}
