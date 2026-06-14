import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VisibilityFilter } from '../../common/guards/visibility.guard';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    q: string,
    pageSize: number,
    visibility: VisibilityFilter,
    types?: string,
  ) {
    if (q.length < 2) throw new BadRequestException('QUERY_TOO_SHORT');

    const requestedTypes = types
      ? types.split(',').map((t) => t.trim())
      : ['customer', 'contact', 'opportunity', 'activity', 'task'];
    const limit = Math.min(pageSize, 20);

    const custWhere = this.buildCustWhere(visibility);
    const oppWhere = this.buildOppWhere(visibility);

    const results: Record<string, { items: any[]; total: number }> = {
      customers: { items: [], total: 0 },
      contacts: { items: [], total: 0 },
      opportunities: { items: [], total: 0 },
      activities: { items: [], total: 0 },
      tasks: { items: [], total: 0 },
    };

    const searches: Promise<void>[] = [];

    if (requestedTypes.includes('customer')) {
      searches.push(
        this.prisma.customer
          .findMany({
            where: {
              ...custWhere,
              OR: [
                { companyName: { contains: q, mode: 'insensitive' } },
                { industry: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              companyName: true,
              industry: true,
              status: true,
            },
            take: limit,
          })
          .then((rows) => {
            results.customers = {
              items: rows.map((r) => ({
                id: r.id,
                type: 'customer',
                title: r.companyName,
                subtitle: `${r.industry ?? ''} · ${r.status}`
                  .trim()
                  .replace(/^·\s*/, ''),
                url: `/customers/${r.id}`,
              })),
              total: rows.length,
            };
          }),
      );
    }

    if (requestedTypes.includes('contact')) {
      searches.push(
        this.prisma.contact
          .findMany({
            where: {
              customer: custWhere,
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              designation: true,
              customer: { select: { companyName: true } },
            },
            take: limit,
          })
          .then((rows) => {
            results.contacts = {
              items: rows.map((r) => ({
                id: r.id,
                type: 'contact',
                title: `${r.firstName} ${r.lastName}`,
                subtitle:
                  `${r.customer?.companyName ?? ''} · ${r.designation ?? ''}`.replace(
                    /^·\s*|\s*·\s*$/,
                    '',
                  ),
                url: `/contacts/${r.id}`,
              })),
              total: rows.length,
            };
          }),
      );
    }

    if (requestedTypes.includes('opportunity')) {
      searches.push(
        this.prisma.opportunity
          .findMany({
            where: { ...oppWhere, name: { contains: q, mode: 'insensitive' } },
            select: {
              id: true,
              name: true,
              expectedRevenue: true,
              stage: { select: { name: true } },
            },
            take: limit,
          })
          .then((rows) => {
            results.opportunities = {
              items: rows.map((r) => ({
                id: r.id,
                type: 'opportunity',
                title: r.name,
                subtitle: `${r.stage.name} · ${r.expectedRevenue ? `$${Number(r.expectedRevenue).toLocaleString()}` : 'No revenue'}`,
                url: `/opportunities/${r.id}`,
              })),
              total: rows.length,
            };
          }),
      );
    }

    if (requestedTypes.includes('activity')) {
      searches.push(
        this.prisma.activity
          .findMany({
            where: {
              customer: custWhere,
              subject: { contains: q, mode: 'insensitive' },
            },
            select: {
              id: true,
              subject: true,
              type: true,
              customer: { select: { companyName: true } },
            },
            take: limit,
          })
          .then((rows) => {
            results.activities = {
              items: rows.map((r) => ({
                id: r.id,
                type: 'activity',
                title: r.subject,
                subtitle: `${r.type} · ${r.customer?.companyName ?? ''}`,
                url: `/customers/${r.customer?.companyName ?? ''}`,
              })),
              total: rows.length,
            };
          }),
      );
    }

    if (requestedTypes.includes('task')) {
      const taskWhere: any = { title: { contains: q, mode: 'insensitive' } };
      if (visibility.ownerId) {
        taskWhere.OR = [
          { assigneeId: visibility.ownerId },
          { createdById: visibility.ownerId },
        ];
      } else if (visibility.ownerIdIn) {
        taskWhere.OR = [
          { assigneeId: { in: visibility.ownerIdIn } },
          { createdById: { in: visibility.ownerIdIn } },
        ];
      }

      searches.push(
        this.prisma.task
          .findMany({
            where: taskWhere,
            select: { id: true, title: true, type: true, status: true },
            take: limit,
          })
          .then((rows) => {
            results.tasks = {
              items: rows.map((r) => ({
                id: r.id,
                type: 'task',
                title: r.title,
                subtitle: `${r.type} · ${r.status}`,
                url: `/tasks`,
              })),
              total: rows.length,
            };
          }),
      );
    }

    await Promise.all(searches);

    const totalResults = Object.values(results).reduce(
      (s, r) => s + r.total,
      0,
    );
    return { ...results, query: q, totalResults };
  }

  private buildCustWhere(visibility: VisibilityFilter) {
    if (visibility.ownerId) return { ownerId: visibility.ownerId };
    if (visibility.ownerIdIn) return { ownerId: { in: visibility.ownerIdIn } };
    return {};
  }

  private buildOppWhere(visibility: VisibilityFilter) {
    if (visibility.ownerId) return { ownerId: visibility.ownerId };
    if (visibility.ownerIdIn) return { ownerId: { in: visibility.ownerIdIn } };
    return {};
  }
}
