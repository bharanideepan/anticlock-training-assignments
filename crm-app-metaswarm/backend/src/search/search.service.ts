import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';

interface ActorPayload {
  sub: string;
  email: string;
  role: RoleName;
  teamIds: string[];
}

interface SearchItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  url: string;
}

interface SearchGroup {
  items: SearchItem[];
  total: number;
}

interface SearchResponse {
  customers: SearchGroup;
  contacts: SearchGroup;
  opportunities: SearchGroup;
  activities: SearchGroup;
  tasks: SearchGroup;
  query: string;
  totalResults: number;
}

type CustomerRow = {
  id: string;
  companyName: string;
  status: string;
  industry: string | null;
  totalCount: bigint;
};

type ContactRow = {
  id: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  companyName: string | null;
  totalCount: bigint;
};

type OpportunityRow = {
  id: string;
  name: string;
  stageName: string;
  expectedRevenue: string | null;
  totalCount: bigint;
};

const EMPTY_GROUP: SearchGroup = { items: [], total: 0 };
const ALL_TYPES = ['customer', 'contact', 'opportunity', 'activity', 'task'];

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(actor: ActorPayload, query: SearchQueryDto): Promise<SearchResponse> {
    const { q, types, page = 1, pageSize = 10 } = query;

    if (q.length < 2) {
      throw new BadRequestException({ code: 'QUERY_TOO_SHORT', message: 'Query must be at least 2 characters' });
    }

    const limit = Math.min(pageSize, 20);
    const offset = (page - 1) * limit;
    const typeFilter = types ? types.split(',').map((t) => t.trim()) : ALL_TYPES;

    const [customers, contacts, opportunities, activities, tasks] = await Promise.all([
      typeFilter.includes('customer') ? this.searchCustomers(actor, q, limit, offset) : EMPTY_GROUP,
      typeFilter.includes('contact') ? this.searchContacts(actor, q, limit, offset) : EMPTY_GROUP,
      typeFilter.includes('opportunity') ? this.searchOpportunities(actor, q, limit, offset) : EMPTY_GROUP,
      typeFilter.includes('activity') ? this.searchActivities(actor, q, limit, offset) : EMPTY_GROUP,
      typeFilter.includes('task') ? this.searchTasks(actor, q, limit, offset) : EMPTY_GROUP,
    ]);

    const totalResults = customers.total + contacts.total + opportunities.total + activities.total + tasks.total;

    return { customers, contacts, opportunities, activities, tasks, query: q, totalResults };
  }

  private async searchCustomers(actor: ActorPayload, q: string, limit: number, offset: number): Promise<SearchGroup> {
    const likeQ = `%${q}%`;
    const ownerClause = this.buildOwnerClause(actor, 'owner_id');

    const rows = await this.prisma.$queryRaw<CustomerRow[]>(Prisma.sql`
      SELECT
        id,
        company_name as "companyName",
        status,
        industry,
        COUNT(*) OVER() as "totalCount"
      FROM customers
      WHERE deleted_at IS NULL
        AND (
          search_vector @@ plainto_tsquery('english', ${q})
          OR company_name ILIKE ${likeQ}
          OR website ILIKE ${likeQ}
        )
        ${ownerClause}
      ORDER BY
        CASE WHEN search_vector IS NOT NULL AND search_vector @@ plainto_tsquery('english', ${q}) THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total = rows.length > 0 ? Number(rows[0].totalCount) : 0;
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: 'customer',
        title: r.companyName,
        subtitle: [r.industry, r.status].filter(Boolean).join(' · '),
        url: `/customers/${r.id}`,
      })),
      total,
    };
  }

  private async searchContacts(actor: ActorPayload, q: string, limit: number, offset: number): Promise<SearchGroup> {
    const likeQ = `%${q}%`;
    const customerOwnerClause = this.buildOwnerClause(actor, 'cu.owner_id');

    const rows = await this.prisma.$queryRaw<ContactRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.first_name as "firstName",
        c.last_name as "lastName",
        c.designation,
        cu.company_name as "companyName",
        COUNT(*) OVER() as "totalCount"
      FROM contacts c
      JOIN customers cu ON cu.id = c.customer_id AND cu.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
        AND (
          c.search_vector @@ plainto_tsquery('english', ${q})
          OR c.first_name ILIKE ${likeQ}
          OR c.last_name ILIKE ${likeQ}
          OR c.email ILIKE ${likeQ}
        )
        ${customerOwnerClause}
      ORDER BY
        CASE WHEN c.search_vector IS NOT NULL AND c.search_vector @@ plainto_tsquery('english', ${q}) THEN 0 ELSE 1 END,
        c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total = rows.length > 0 ? Number(rows[0].totalCount) : 0;
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: 'contact',
        title: `${r.firstName} ${r.lastName}`,
        subtitle: [r.companyName, r.designation].filter(Boolean).join(' · '),
        url: `/contacts/${r.id}`,
      })),
      total,
    };
  }

  private async searchOpportunities(actor: ActorPayload, q: string, limit: number, offset: number): Promise<SearchGroup> {
    const likeQ = `%${q}%`;
    const ownerClause = this.buildOwnerClause(actor, 'o.owner_id');

    const rows = await this.prisma.$queryRaw<OpportunityRow[]>(Prisma.sql`
      SELECT
        o.id,
        o.name,
        ps.name as "stageName",
        o.expected_revenue::text as "expectedRevenue",
        COUNT(*) OVER() as "totalCount"
      FROM opportunities o
      JOIN pipeline_stages ps ON ps.id = o.stage_id
      WHERE o.deleted_at IS NULL
        AND (
          o.search_vector @@ plainto_tsquery('english', ${q})
          OR o.name ILIKE ${likeQ}
        )
        ${ownerClause}
      ORDER BY
        CASE WHEN o.search_vector IS NOT NULL AND o.search_vector @@ plainto_tsquery('english', ${q}) THEN 0 ELSE 1 END,
        o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total = rows.length > 0 ? Number(rows[0].totalCount) : 0;
    return {
      items: rows.map((r) => {
        const revenue = r.expectedRevenue ? `$${Number(r.expectedRevenue).toLocaleString()}` : null;
        return {
          id: r.id,
          type: 'opportunity',
          title: r.name,
          subtitle: [r.stageName, revenue].filter(Boolean).join(' · '),
          url: `/opportunities/${r.id}`,
        };
      }),
      total,
    };
  }

  private async searchActivities(actor: ActorPayload, q: string, limit: number, offset: number): Promise<SearchGroup> {
    const where = this.buildActivityWhere(actor, q);

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        select: { id: true, subject: true, type: true, description: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      items: items.map((a) => ({
        id: a.id,
        type: 'activity',
        title: a.subject,
        subtitle: a.type,
        url: `/activities/${a.id}`,
      })),
      total,
    };
  }

  private async searchTasks(actor: ActorPayload, q: string, limit: number, offset: number): Promise<SearchGroup> {
    const where = this.buildTaskWhere(actor, q);

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        select: { id: true, title: true, type: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items: items.map((t) => ({
        id: t.id,
        type: 'task',
        title: t.title,
        subtitle: `${t.type} · ${t.status}`,
        url: `/tasks/${t.id}`,
      })),
      total,
    };
  }

  private buildOwnerClause(actor: ActorPayload, ownerColumn: string): Prisma.Sql {
    if (actor.role === RoleName.SYSTEM_ADMINISTRATOR) {
      return Prisma.sql``;
    }
    if (actor.role === RoleName.SALES_REPRESENTATIVE) {
      return Prisma.sql`AND ${Prisma.raw(ownerColumn)} = ${actor.sub}`;
    }
    // SALES_MANAGER, SUPPORT_REPRESENTATIVE, READ_ONLY — team-scoped
    if (!actor.teamIds || actor.teamIds.length === 0) {
      return Prisma.sql`AND 1=0`;
    }
    return Prisma.sql`AND ${Prisma.raw(ownerColumn)} IN (
      SELECT user_id FROM team_members WHERE team_id IN (${Prisma.join(actor.teamIds)})
    )`;
  }

  private buildActivityWhere(actor: ActorPayload, q: string) {
    const textFilter = {
      OR: [
        { subject: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    };

    const visibilityFilter =
      actor.role === RoleName.SALES_REPRESENTATIVE || actor.role === RoleName.SUPPORT_REPRESENTATIVE
        ? { createdById: actor.sub }
        : {};

    return { ...textFilter, ...visibilityFilter, deletedAt: null };
  }

  private buildTaskWhere(actor: ActorPayload, q: string) {
    const textFilter = {
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    };

    const visibilityFilter =
      actor.role === RoleName.SALES_REPRESENTATIVE || actor.role === RoleName.SUPPORT_REPRESENTATIVE
        ? { assigneeId: actor.sub }
        : {};

    return { ...textFilter, ...visibilityFilter, deletedAt: null };
  }
}
