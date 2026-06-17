import { Injectable } from '@nestjs/common';
import { Prisma, RoleName, TerminalOutcome } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';

interface Actor {
  sub: string;
  role: RoleName;
  teamIds: string[];
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------- Sales Reports -----------------------------

  async salesRevenue(actor: Actor, query: ReportQueryDto) {
    const opWhere = this.buildOpportunityWhere(actor, query, 'actualCloseDate');
    const [wonAgg, activeOpps, byPeriod] = await Promise.all([
      this.prisma.opportunity.aggregate({
        _sum: { expectedRevenue: true },
        where: { ...opWhere, stage: { terminalOutcome: TerminalOutcome.WON } },
      }),
      this.prisma.opportunity.findMany({
        where: { ...opWhere, stage: { isTerminal: false }, probability: { gt: 0 } },
        select: { expectedRevenue: true, probability: true },
      }),
      this.getRevenueByPeriod(actor, query),
    ]);

    const forecastRevenue = activeOpps.reduce((sum, o) => {
      const rev = o.expectedRevenue ? Number(o.expectedRevenue) : 0;
      const prob = o.probability ?? 0;
      return sum + (rev * prob) / 100;
    }, 0);

    return {
      totalWonRevenue: this.formatDecimal(wonAgg._sum.expectedRevenue),
      totalForecastRevenue: forecastRevenue.toFixed(2),
      byPeriod,
    };
  }

  async salesWinRate(actor: Actor, query: ReportQueryDto) {
    const opWhere = this.buildOpportunityWhere(actor, query, 'actualCloseDate');
    const [totalWon, totalLost] = await Promise.all([
      this.prisma.opportunity.count({ where: { ...opWhere, stage: { terminalOutcome: TerminalOutcome.WON } } }),
      this.prisma.opportunity.count({ where: { ...opWhere, stage: { terminalOutcome: TerminalOutcome.LOST } } }),
    ]);

    const totalClosed = totalWon + totalLost;
    const winRate = totalClosed > 0 ? Math.round((totalWon / totalClosed) * 1000) / 10 : 0;

    const byOwner = await this.getWinRateByOwner(actor, query);

    return { totalClosed, totalWon, totalLost, winRate, byOwner };
  }

  async salesConversionRate(actor: Actor, query: ReportQueryDto) {
    const opWhere = this.buildOpportunityWhere(actor, query, 'createdAt');
    const [totalLeads, convertedToQualified, convertedToProposal, convertedToNegotiation, closedWon] =
      await Promise.all([
        this.prisma.opportunity.count({ where: { ...opWhere, stage: { name: 'Lead' } } }),
        this.prisma.opportunity.count({ where: { ...opWhere, stage: { name: 'Qualified' } } }),
        this.prisma.opportunity.count({ where: { ...opWhere, stage: { name: 'Proposal' } } }),
        this.prisma.opportunity.count({ where: { ...opWhere, stage: { name: 'Negotiation' } } }),
        this.prisma.opportunity.count({ where: { ...opWhere, stage: { terminalOutcome: TerminalOutcome.WON } } }),
      ]);

    const leadToWinRate = totalLeads > 0 ? Math.round((closedWon / totalLeads) * 1000) / 10 : 0;

    return { totalLeads, convertedToQualified, convertedToProposal, convertedToNegotiation, closedWon, leadToWinRate };
  }

  async salesOpportunityTrends(actor: Actor, query: ReportQueryDto) {
    const opWhere = this.buildOpportunityWhere(actor, query, 'createdAt');
    const rows = await this.prisma.$queryRaw<{ period: string; created: bigint; won: bigint; lost: bigint; open: bigint }[]>(
      Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') as period,
          COUNT(*) as created,
          COUNT(*) FILTER (WHERE ps.terminal_outcome = 'WON') as won,
          COUNT(*) FILTER (WHERE ps.terminal_outcome = 'LOST') as lost,
          COUNT(*) FILTER (WHERE ps.is_terminal = false) as open
        FROM opportunities o
        JOIN pipeline_stages ps ON ps.id = o.stage_id
        WHERE o.deleted_at IS NULL
          AND o.created_at >= ${new Date(query.fromDate)}
          AND o.created_at <= ${new Date(query.toDate)}
          ${this.buildRawOwnerClause(actor, query, 'o.owner_id')}
        GROUP BY DATE_TRUNC('month', o.created_at)
        ORDER BY period
      `,
    );

    return {
      byPeriod: rows.map((r) => ({
        period: r.period,
        created: Number(r.created),
        won: Number(r.won),
        lost: Number(r.lost),
        open: Number(r.open),
      })),
    };
  }

  // ----------------------------- Customer Reports --------------------------

  async customersGrowth(actor: Actor, query: ReportQueryDto) {
    const rows = await this.prisma.$queryRaw<{ period: string; new: bigint; churned: bigint }[]>(
      Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as period,
          COUNT(*) FILTER (WHERE status != 'ARCHIVED') as new,
          COUNT(*) FILTER (WHERE status IN ('INACTIVE', 'ARCHIVED')) as churned
        FROM customers
        WHERE deleted_at IS NULL
          AND created_at >= ${new Date(query.fromDate)}
          AND created_at <= ${new Date(query.toDate)}
          ${this.buildRawOwnerClause(actor, query, 'owner_id')}
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY period
      `,
    );

    return {
      byPeriod: rows.map((r) => ({
        period: r.period,
        new: Number(r.new),
        churned: Number(r.churned),
        net: Number(r.new) - Number(r.churned),
      })),
    };
  }

  async customersDistribution(actor: Actor, query: ReportQueryDto) {
    const custWhere = this.buildCustomerWhere(actor);
    const [byStatus, byRevenueRange] = await Promise.all([
      this.prisma.customer.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { ...custWhere, deletedAt: null },
      }),
      this.prisma.customer.groupBy({
        by: ['revenueRange'],
        _count: { id: true },
        where: { ...custWhere, deletedAt: null, revenueRange: { not: null } },
      }),
    ]);

    return {
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count.id })),
      byRevenueRange: byRevenueRange
        .filter((r) => r.revenueRange !== null)
        .map((r) => ({ range: r.revenueRange!, count: r._count.id })),
    };
  }

  async customersIndustryAnalysis(actor: Actor, query: ReportQueryDto) {
    const custWhere = this.buildCustomerWhere(actor);
    const rows = await this.prisma.customer.groupBy({
      by: ['industry'],
      _count: { id: true },
      where: { ...custWhere, deletedAt: null, industry: { not: null } },
      orderBy: { _count: { id: 'desc' } },
    });

    const total = rows.reduce((sum, r) => sum + r._count.id, 0);
    return rows
      .filter((r) => r.industry !== null)
      .map((r) => ({
        industry: r.industry!,
        count: r._count.id,
        percentage: total > 0 ? Math.round((r._count.id / total) * 1000) / 10 : 0,
      }));
  }

  // ----------------------------- Productivity Reports ----------------------

  async productivityActivityCompletion(actor: Actor, query: ReportQueryDto) {
    const actWhere = this.buildActivityWhere(actor, query);
    const [totalActivities, byType] = await Promise.all([
      this.prisma.activity.count({ where: actWhere }),
      this.prisma.activity.groupBy({
        by: ['type'],
        _count: { id: true },
        where: actWhere,
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    const byOwner = await this.getActivityByOwner(actor, query);

    return {
      totalActivities,
      byType: byType.map((r) => ({ type: r.type, count: r._count.id })),
      byOwner,
    };
  }

  async productivityTaskCompletion(actor: Actor, query: ReportQueryDto) {
    const taskWhere = this.buildTaskWhere(actor, query);
    const now = new Date();
    const [totalTasks, completed, cancelled, overdue] = await Promise.all([
      this.prisma.task.count({ where: taskWhere }),
      this.prisma.task.count({ where: { ...taskWhere, status: 'COMPLETED' } }),
      this.prisma.task.count({ where: { ...taskWhere, status: 'CANCELLED' } }),
      this.prisma.task.count({ where: { ...taskWhere, status: 'OPEN', dueDate: { lt: now } } }),
    ]);

    const byAssignee = await this.getTaskByAssignee(actor, query, now);
    const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 1000) / 10 : 0;

    return { totalTasks, completed, cancelled, overdue, completionRate, byAssignee };
  }

  async productivityOpportunityOwnership(actor: Actor, query: ReportQueryDto) {
    const opWhere = this.buildOpportunityWhere(actor, query, 'createdAt');
    const owners = await this.prisma.user.findMany({
      where: { deletedAt: null, ownedOpportunities: { some: opWhere } },
      select: { id: true, firstName: true, lastName: true },
    });

    const results = await Promise.all(
      owners.map(async (owner) => {
        const ownerOpWhere = { ...opWhere, ownerId: owner.id };
        const [openCount, wonOpps] = await Promise.all([
          this.prisma.opportunity.count({ where: { ...ownerOpWhere, stage: { isTerminal: false } } }),
          this.prisma.opportunity.findMany({
            where: { ...ownerOpWhere, stage: { terminalOutcome: TerminalOutcome.WON } },
            select: { expectedRevenue: true },
          }),
        ]);

        const wonRevenue = wonOpps.reduce((sum, o) => sum + (o.expectedRevenue ? Number(o.expectedRevenue) : 0), 0);
        return {
          owner,
          openOpportunities: openCount,
          pipelineValue: '0.00',
          wonThisPeriod: wonOpps.length,
          wonRevenue: wonRevenue.toFixed(2),
        };
      }),
    );

    return results;
  }

  // ----------------------------- CSV Export --------------------------------

  async exportCsv(reportType: string, actor: Actor, query: ReportQueryDto): Promise<string> {
    const data = await this.getReportData(reportType, actor, query);
    return this.toCsv(data);
  }

  // ----------------------------- Helpers -----------------------------------

  private async getReportData(reportType: string, actor: Actor, query: ReportQueryDto): Promise<Record<string, unknown>[]> {
    switch (reportType) {
      case 'sales-revenue': {
        const d = await this.salesRevenue(actor, query);
        return [{ totalWonRevenue: d.totalWonRevenue, totalForecastRevenue: d.totalForecastRevenue }, ...d.byPeriod];
      }
      case 'sales-win-rate': {
        const d = await this.salesWinRate(actor, query);
        return [{ totalClosed: d.totalClosed, totalWon: d.totalWon, totalLost: d.totalLost, winRate: d.winRate }, ...d.byOwner.map((o) => ({ ownerFirstName: o.owner.firstName, ownerLastName: o.owner.lastName, won: o.won, lost: o.lost, winRate: o.winRate }))];
      }
      case 'sales-conversion': {
        const d = await this.salesConversionRate(actor, query);
        return [d as unknown as Record<string, unknown>];
      }
      case 'sales-opportunity-trends': {
        const d = await this.salesOpportunityTrends(actor, query);
        return d.byPeriod;
      }
      case 'customers-growth': {
        const d = await this.customersGrowth(actor, query);
        return d.byPeriod;
      }
      case 'customers-distribution': {
        const d = await this.customersDistribution(actor, query);
        return [...d.byStatus, ...d.byRevenueRange];
      }
      case 'customers-industry': {
        const rows = await this.customersIndustryAnalysis(actor, query);
        return rows;
      }
      case 'productivity-activity': {
        const d = await this.productivityActivityCompletion(actor, query);
        return [{ totalActivities: d.totalActivities }, ...d.byType];
      }
      case 'productivity-task': {
        const d = await this.productivityTaskCompletion(actor, query);
        return [{ totalTasks: d.totalTasks, completed: d.completed, cancelled: d.cancelled, overdue: d.overdue, completionRate: d.completionRate }];
      }
      case 'productivity-opportunity': {
        const rows = await this.productivityOpportunityOwnership(actor, query);
        return rows.map((r) => ({
          firstName: r.owner.firstName, lastName: r.owner.lastName,
          openOpportunities: r.openOpportunities, wonThisPeriod: r.wonThisPeriod, wonRevenue: r.wonRevenue,
        }));
      }
      default:
        return [];
    }
  }

  private toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => {
          const val = row[h] ?? '';
          return String(val).includes(',') ? `"${val}"` : String(val);
        }).join(','),
      ),
    ];
    return lines.join('\n');
  }

  private buildOpportunityWhere(actor: Actor, query: ReportQueryDto, dateField: string) {
    const dateFilter = { gte: new Date(query.fromDate), lte: new Date(query.toDate) };
    const base: Record<string, unknown> = { [dateField]: dateFilter, deletedAt: null };
    return { ...base, ...this.buildOwnerFilter(actor, query) };
  }

  private buildCustomerWhere(actor: Actor) {
    if (actor.role === RoleName.SALES_REPRESENTATIVE) return { ownerId: actor.sub };
    if (actor.role === RoleName.SALES_MANAGER && actor.teamIds.length > 0) {
      return { owner: { teamMemberships: { some: { teamId: { in: actor.teamIds } } } } };
    }
    return {};
  }

  private buildActivityWhere(actor: Actor, query: ReportQueryDto) {
    const base: Record<string, unknown> = {
      createdAt: { gte: new Date(query.fromDate), lte: new Date(query.toDate) },
      deletedAt: null,
    };
    if (actor.role === RoleName.SALES_REPRESENTATIVE || actor.role === RoleName.SUPPORT_REPRESENTATIVE) {
      base['createdById'] = actor.sub;
    } else if (query.ownerId) {
      base['createdById'] = query.ownerId;
    }
    return base;
  }

  private buildTaskWhere(actor: Actor, query: ReportQueryDto) {
    const base: Record<string, unknown> = {
      createdAt: { gte: new Date(query.fromDate), lte: new Date(query.toDate) },
      deletedAt: null,
    };
    if (actor.role === RoleName.SALES_REPRESENTATIVE || actor.role === RoleName.SUPPORT_REPRESENTATIVE) {
      base['assigneeId'] = actor.sub;
    } else if (query.ownerId) {
      base['assigneeId'] = query.ownerId;
    }
    return base;
  }

  private buildOwnerFilter(actor: Actor, query: ReportQueryDto): Record<string, unknown> {
    if (actor.role === RoleName.SALES_REPRESENTATIVE) return { ownerId: actor.sub };
    if (query.ownerId) return { ownerId: query.ownerId };
    if (query.teamId) return { owner: { teamMemberships: { some: { teamId: query.teamId } } } };
    if (actor.role === RoleName.SALES_MANAGER && actor.teamIds.length > 0) {
      return { owner: { teamMemberships: { some: { teamId: { in: actor.teamIds } } } } };
    }
    return {};
  }

  private buildRawOwnerClause(actor: Actor, query: ReportQueryDto, ownerColumn: string): Prisma.Sql {
    if (actor.role === RoleName.SALES_REPRESENTATIVE) {
      return Prisma.sql`AND ${Prisma.raw(ownerColumn)} = ${actor.sub}`;
    }
    if (query.ownerId) {
      return Prisma.sql`AND ${Prisma.raw(ownerColumn)} = ${query.ownerId}`;
    }
    if (query.teamId) {
      return Prisma.sql`AND ${Prisma.raw(ownerColumn)} IN (SELECT user_id FROM team_members WHERE team_id = ${query.teamId})`;
    }
    if (actor.role === RoleName.SALES_MANAGER && actor.teamIds.length > 0) {
      return Prisma.sql`AND ${Prisma.raw(ownerColumn)} IN (SELECT user_id FROM team_members WHERE team_id IN (${Prisma.join(actor.teamIds)}))`;
    }
    return Prisma.sql``;
  }

  private async getRevenueByPeriod(actor: Actor, query: ReportQueryDto) {
    const rows = await this.prisma.$queryRaw<{ period: string; wonRevenue: string | null; forecastRevenue: string | null }[]>(
      Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', o.actual_close_date), 'YYYY-MM') as period,
          SUM(CASE WHEN ps.terminal_outcome = 'WON' THEN o.expected_revenue ELSE 0 END) as "wonRevenue",
          SUM(CASE WHEN ps.is_terminal = false AND o.probability > 0 THEN o.expected_revenue * o.probability / 100 ELSE 0 END) as "forecastRevenue"
        FROM opportunities o
        JOIN pipeline_stages ps ON ps.id = o.stage_id
        WHERE o.deleted_at IS NULL
          AND o.actual_close_date >= ${new Date(query.fromDate)}
          AND o.actual_close_date <= ${new Date(query.toDate)}
          ${this.buildRawOwnerClause(actor, query, 'o.owner_id')}
        GROUP BY DATE_TRUNC('month', o.actual_close_date)
        ORDER BY period
      `,
    );

    return rows.map((r) => ({
      period: r.period,
      wonRevenue: this.formatDecimal(r.wonRevenue),
      forecastRevenue: this.formatDecimal(r.forecastRevenue),
    }));
  }

  private async getWinRateByOwner(actor: Actor, query: ReportQueryDto) {
    const opWhere = this.buildOpportunityWhere(actor, query, 'actualCloseDate');
    const owners = await this.prisma.user.findMany({
      where: { deletedAt: null, ownedOpportunities: { some: opWhere } },
      select: { id: true, firstName: true, lastName: true },
    });

    return Promise.all(
      owners.map(async (owner) => {
        const [won, lost] = await Promise.all([
          this.prisma.opportunity.count({ where: { ...opWhere, ownerId: owner.id, stage: { terminalOutcome: TerminalOutcome.WON } } }),
          this.prisma.opportunity.count({ where: { ...opWhere, ownerId: owner.id, stage: { terminalOutcome: TerminalOutcome.LOST } } }),
        ]);
        const total = won + lost;
        return { owner, won, lost, winRate: total > 0 ? Math.round((won / total) * 1000) / 10 : 0 };
      }),
    );
  }

  private async getActivityByOwner(actor: Actor, query: ReportQueryDto) {
    const actWhere = this.buildActivityWhere(actor, query);
    const owners = await this.prisma.user.findMany({
      where: { deletedAt: null, createdActivities: { some: actWhere } },
      select: { id: true, firstName: true, lastName: true },
    });

    return Promise.all(
      owners.map(async (owner) => {
        const count = await this.prisma.activity.count({ where: { ...actWhere, createdById: owner.id } });
        return { owner, count };
      }),
    );
  }

  private async getTaskByAssignee(actor: Actor, query: ReportQueryDto, now: Date) {
    const taskWhere = this.buildTaskWhere(actor, query);
    const owners = await this.prisma.user.findMany({
      where: { deletedAt: null, assignedTasks: { some: taskWhere } },
      select: { id: true, firstName: true, lastName: true },
    });

    return Promise.all(
      owners.map(async (owner) => {
        const [completed, overdue] = await Promise.all([
          this.prisma.task.count({ where: { ...taskWhere, assigneeId: owner.id, status: 'COMPLETED' } }),
          this.prisma.task.count({ where: { ...taskWhere, assigneeId: owner.id, status: 'OPEN', dueDate: { lt: now } } }),
        ]);
        return { assignee: owner, completed, overdue };
      }),
    );
  }

  private formatDecimal(value: unknown): string {
    if (value === null || value === undefined) return '0.00';
    return Number(value).toFixed(2);
  }
}
