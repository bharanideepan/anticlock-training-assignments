import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { VisibilityFilter } from '../../common/guards/visibility.guard';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDateRange(filter: ReportFilterDto) {
    return { gte: new Date(filter.fromDate), lte: new Date(filter.toDate) };
  }

  private buildOppWhere(filter: ReportFilterDto, visibility: VisibilityFilter) {
    const where: any = {};
    if (filter.ownerId) where.ownerId = filter.ownerId;
    else if (visibility.ownerId) where.ownerId = visibility.ownerId;
    else if (visibility.ownerIdIn) where.ownerId = { in: visibility.ownerIdIn };
    return where;
  }

  private buildCustWhere(
    filter: ReportFilterDto,
    visibility: VisibilityFilter,
  ) {
    const where: any = {};
    if (filter.ownerId) where.ownerId = filter.ownerId;
    else if (visibility.ownerId) where.ownerId = visibility.ownerId;
    else if (visibility.ownerIdIn) where.ownerId = { in: visibility.ownerIdIn };
    return where;
  }

  private periodLabel(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private monthsInRange(from: Date, to: Date) {
    const months: string[] = [];
    const d = new Date(from.getFullYear(), from.getMonth(), 1);
    while (d <= to) {
      months.push(this.periodLabel(d));
      d.setMonth(d.getMonth() + 1);
    }
    return months;
  }

  async getSalesRevenue(filter: ReportFilterDto, visibility: VisibilityFilter) {
    const oppWhere = this.buildOppWhere(filter, visibility);
    const dateRange = this.buildDateRange(filter);
    const from = new Date(filter.fromDate);
    const to = new Date(filter.toDate);
    const periods = this.monthsInRange(from, to);

    const [wonOpps, openOpps] = await Promise.all([
      this.prisma.opportunity.findMany({
        where: {
          ...oppWhere,
          stage: { terminalOutcome: 'WON' },
          actualCloseDate: dateRange,
        },
        select: { expectedRevenue: true, actualCloseDate: true },
      }),
      this.prisma.opportunity.findMany({
        where: {
          ...oppWhere,
          actualCloseDate: null,
          expectedCloseDate: dateRange,
        },
        select: {
          expectedRevenue: true,
          probability: true,
          expectedCloseDate: true,
        },
      }),
    ]);

    const totalWonRevenue = wonOpps.reduce(
      (s, o) => s + Number(o.expectedRevenue ?? 0),
      0,
    );
    const totalForecastRevenue = openOpps.reduce(
      (s, o) =>
        s + (Number(o.expectedRevenue ?? 0) * (o.probability ?? 0)) / 100,
      0,
    );

    const byPeriod = periods.map((period) => {
      const wonRev = wonOpps
        .filter(
          (o) =>
            o.actualCloseDate && this.periodLabel(o.actualCloseDate) === period,
        )
        .reduce((s, o) => s + Number(o.expectedRevenue ?? 0), 0);
      const fcRev = openOpps
        .filter(
          (o) =>
            o.expectedCloseDate &&
            this.periodLabel(o.expectedCloseDate) === period,
        )
        .reduce(
          (s, o) =>
            s + (Number(o.expectedRevenue ?? 0) * (o.probability ?? 0)) / 100,
          0,
        );
      return {
        period,
        wonRevenue: wonRev.toFixed(2),
        forecastRevenue: fcRev.toFixed(2),
      };
    });

    return {
      totalWonRevenue: totalWonRevenue.toFixed(2),
      totalForecastRevenue: totalForecastRevenue.toFixed(2),
      byPeriod,
    };
  }

  async getSalesWinRate(filter: ReportFilterDto, visibility: VisibilityFilter) {
    const oppWhere = this.buildOppWhere(filter, visibility);
    const dateRange = this.buildDateRange(filter);

    const closed = await this.prisma.opportunity.findMany({
      where: {
        ...oppWhere,
        actualCloseDate: dateRange,
        stage: { terminalOutcome: { not: null } },
      },
      select: {
        id: true,
        stage: { select: { terminalOutcome: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const won = closed.filter((o) => o.stage.terminalOutcome === 'WON');
    const lost = closed.filter((o) => o.stage.terminalOutcome === 'LOST');
    const winRate = closed.length ? (won.length / closed.length) * 100 : 0;

    const ownerMap = new Map<
      string,
      { owner: any; won: number; lost: number }
    >();
    for (const o of closed) {
      const key = o.owner?.id ?? 'unknown';
      const existing = ownerMap.get(key) ?? { owner: o.owner, won: 0, lost: 0 };
      if (o.stage.terminalOutcome === 'WON') existing.won++;
      else existing.lost++;
      ownerMap.set(key, existing);
    }

    const byOwner = Array.from(ownerMap.values()).map((entry) => ({
      owner: entry.owner,
      won: entry.won,
      lost: entry.lost,
      winRate:
        entry.won + entry.lost > 0
          ? Math.round((entry.won / (entry.won + entry.lost)) * 1000) / 10
          : 0,
    }));

    return {
      totalClosed: closed.length,
      totalWon: won.length,
      totalLost: lost.length,
      winRate: Math.round(winRate * 10) / 10,
      byOwner,
    };
  }

  async getSalesConversionRate(
    filter: ReportFilterDto,
    visibility: VisibilityFilter,
  ) {
    const oppWhere = this.buildOppWhere(filter, visibility);
    const dateRange = this.buildDateRange(filter);

    const allOpps = await this.prisma.opportunity.findMany({
      where: { ...oppWhere, createdAt: dateRange },
      select: {
        stage: {
          select: { name: true, terminalOutcome: true, displayOrder: true },
        },
      },
    });

    const total = allOpps.length;
    const counts: Record<string, number> = {};
    for (const o of allOpps) {
      const name = o.stage.name.toLowerCase();
      counts[name] = (counts[name] ?? 0) + 1;
    }

    const qualified = Object.entries(counts)
      .filter(([k]) => k.includes('qualified'))
      .reduce((s, [, v]) => s + v, 0);
    const proposal = Object.entries(counts)
      .filter(([k]) => k.includes('proposal'))
      .reduce((s, [, v]) => s + v, 0);
    const negotiation = Object.entries(counts)
      .filter(([k]) => k.includes('negotiation'))
      .reduce((s, [, v]) => s + v, 0);
    const won = allOpps.filter((o) => o.stage.terminalOutcome === 'WON').length;

    return {
      totalLeads: total,
      convertedToQualified: qualified,
      convertedToProposal: proposal,
      convertedToNegotiation: negotiation,
      closedWon: won,
      leadToWinRate: total ? Math.round((won / total) * 1000) / 10 : 0,
    };
  }

  async getSalesOpportunityTrends(
    filter: ReportFilterDto,
    visibility: VisibilityFilter,
  ) {
    const oppWhere = this.buildOppWhere(filter, visibility);
    const from = new Date(filter.fromDate);
    const to = new Date(filter.toDate);
    const periods = this.monthsInRange(from, to);

    const allOpps = await this.prisma.opportunity.findMany({
      where: { ...oppWhere, createdAt: { gte: from, lte: to } },
      select: {
        createdAt: true,
        actualCloseDate: true,
        stage: { select: { terminalOutcome: true } },
      },
    });

    const byPeriod = periods.map((period) => {
      const created = allOpps.filter(
        (o) => this.periodLabel(o.createdAt) === period,
      ).length;
      const won = allOpps.filter(
        (o) =>
          o.stage.terminalOutcome === 'WON' &&
          o.actualCloseDate &&
          this.periodLabel(o.actualCloseDate) === period,
      ).length;
      const lost = allOpps.filter(
        (o) =>
          o.stage.terminalOutcome === 'LOST' &&
          o.actualCloseDate &&
          this.periodLabel(o.actualCloseDate) === period,
      ).length;
      const open = allOpps.filter(
        (o) => !o.actualCloseDate && this.periodLabel(o.createdAt) === period,
      ).length;
      return { period, created, won, lost, open };
    });

    return { byPeriod };
  }

  async getCustomerGrowth(
    filter: ReportFilterDto,
    visibility: VisibilityFilter,
  ) {
    const custWhere = this.buildCustWhere(filter, visibility);
    const from = new Date(filter.fromDate);
    const to = new Date(filter.toDate);
    const periods = this.monthsInRange(from, to);

    const customers = await this.prisma.customer.findMany({
      where: { ...custWhere, createdAt: { gte: from, lte: to } },
      select: { createdAt: true, deletedAt: true },
    });

    const byPeriod = periods.map((period) => {
      const newC = customers.filter(
        (c) => this.periodLabel(c.createdAt) === period,
      ).length;
      const churned = customers.filter(
        (c) => c.deletedAt && this.periodLabel(c.deletedAt) === period,
      ).length;
      return { period, new: newC, churned, net: newC - churned };
    });

    return { byPeriod };
  }

  async getCustomerDistribution(
    filter: ReportFilterDto,
    visibility: VisibilityFilter,
  ) {
    const custWhere = this.buildCustWhere(filter, visibility);

    const customers = await this.prisma.customer.findMany({
      where: custWhere,
      select: { status: true, revenueRange: true },
    });

    const statusMap = new Map<string, number>();
    const rangeMap = new Map<string, number>();
    for (const c of customers) {
      statusMap.set(c.status, (statusMap.get(c.status) ?? 0) + 1);
      if (c.revenueRange)
        rangeMap.set(c.revenueRange, (rangeMap.get(c.revenueRange) ?? 0) + 1);
    }

    return {
      byStatus: Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      byRevenueRange: Array.from(rangeMap.entries()).map(([range, count]) => ({
        range,
        count,
      })),
    };
  }

  async getCustomerIndustryAnalysis(
    filter: ReportFilterDto,
    visibility: VisibilityFilter,
  ) {
    const custWhere = this.buildCustWhere(filter, visibility);
    const customers = await this.prisma.customer.findMany({
      where: custWhere,
      select: { industry: true },
    });

    const map = new Map<string, number>();
    for (const c of customers) {
      const ind = c.industry ?? 'Unknown';
      map.set(ind, (map.get(ind) ?? 0) + 1);
    }

    const total = customers.length;
    return Array.from(map.entries())
      .map(([industry, count]) => ({
        industry,
        count,
        percentage: total ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getProductivityActivityCompletion(
    filter: ReportFilterDto,
    visibility: VisibilityFilter,
  ) {
    const where: any = { createdAt: this.buildDateRange(filter) };
    if (filter.ownerId) where.createdById = filter.ownerId;
    else if (visibility.ownerId) where.createdById = visibility.ownerId;
    else if (visibility.ownerIdIn)
      where.createdById = { in: visibility.ownerIdIn };

    const activities = await this.prisma.activity.findMany({
      where,
      select: {
        type: true,
        createdById: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const typeMap = new Map<string, number>();
    const ownerMap = new Map<string, { owner: any; count: number }>();
    for (const a of activities) {
      typeMap.set(a.type, (typeMap.get(a.type) ?? 0) + 1);
      const key = a.createdById;
      const existing = ownerMap.get(key) ?? { owner: a.createdBy, count: 0 };
      existing.count++;
      ownerMap.set(key, existing);
    }

    return {
      totalActivities: activities.length,
      byType: Array.from(typeMap.entries()).map(([type, count]) => ({
        type,
        count,
      })),
      byOwner: Array.from(ownerMap.values()),
    };
  }

  async getProductivityTaskCompletion(
    filter: ReportFilterDto,
    _visibility: VisibilityFilter,
  ) {
    const where: any = { createdAt: this.buildDateRange(filter) };
    if (filter.ownerId) where.assigneeId = filter.ownerId;

    const tasks = await this.prisma.task.findMany({
      where,
      select: {
        status: true,
        dueDate: true,
        assigneeId: true,
        completedAt: true,
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const now = new Date();
    const completed = tasks.filter((t) => t.status === 'COMPLETED');
    const cancelled = tasks.filter((t) => t.status === 'CANCELLED');
    const overdue = tasks.filter(
      (t) => t.status === 'OPEN' && t.dueDate && t.dueDate < now,
    );

    const assigneeMap = new Map<
      string,
      { assignee: any; completed: number; overdue: number }
    >();
    for (const t of tasks) {
      const key = t.assigneeId ?? 'unassigned';
      const existing = assigneeMap.get(key) ?? {
        assignee: t.assignee,
        completed: 0,
        overdue: 0,
      };
      if (t.status === 'COMPLETED') existing.completed++;
      if (t.status === 'OPEN' && t.dueDate && t.dueDate < now)
        existing.overdue++;
      assigneeMap.set(key, existing);
    }

    return {
      totalTasks: tasks.length,
      completed: completed.length,
      cancelled: cancelled.length,
      overdue: overdue.length,
      completionRate: tasks.length
        ? Math.round((completed.length / tasks.length) * 1000) / 10
        : 0,
      byAssignee: Array.from(assigneeMap.values()),
    };
  }

  async getProductivityOpportunityOwnership(
    filter: ReportFilterDto,
    visibility: VisibilityFilter,
  ) {
    const oppWhere = this.buildOppWhere(filter, visibility);
    const dateRange = this.buildDateRange(filter);

    const users = await this.prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true },
    });

    const result = await Promise.all(
      users.map(async (user) => {
        const [openOpps, wonOpps] = await Promise.all([
          this.prisma.opportunity.findMany({
            where: { ...oppWhere, ownerId: user.id, actualCloseDate: null },
            select: { expectedRevenue: true },
          }),
          this.prisma.opportunity.findMany({
            where: {
              ...oppWhere,
              ownerId: user.id,
              stage: { terminalOutcome: 'WON' },
              actualCloseDate: dateRange,
            },
            select: { expectedRevenue: true },
          }),
        ]);
        if (!openOpps.length && !wonOpps.length) return null;
        return {
          owner: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          openOpportunities: openOpps.length,
          pipelineValue: openOpps
            .reduce((s, o) => s + Number(o.expectedRevenue ?? 0), 0)
            .toFixed(2),
          wonThisPeriod: wonOpps.length,
          wonRevenue: wonOpps
            .reduce((s, o) => s + Number(o.expectedRevenue ?? 0), 0)
            .toFixed(2),
        };
      }),
    );

    return result.filter(Boolean);
  }
}
