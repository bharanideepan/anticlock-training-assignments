import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, RoleName, TerminalOutcome } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private periodStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private periodEnd(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  private yearStart(): Date {
    return new Date(new Date().getFullYear(), 0, 1);
  }

  private yearEnd(): Date {
    return new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  private customerScope(actorRole: RoleName, actorId: string): Record<string, unknown> {
    if (actorRole === RoleName.SALES_REPRESENTATIVE) return { ownerId: actorId };
    return {};
  }

  private opportunityScope(actorRole: RoleName, actorId: string): Record<string, unknown> {
    if (actorRole === RoleName.SALES_REPRESENTATIVE) return { ownerId: actorId };
    return {};
  }

  private taskScope(actorRole: RoleName, actorId: string): Record<string, unknown> {
    if (actorRole === RoleName.SALES_REPRESENTATIVE || actorRole === RoleName.SUPPORT_REPRESENTATIVE) {
      return { assigneeId: actorId };
    }
    return {};
  }

  private activityScope(actorRole: RoleName, actorId: string): Record<string, unknown> {
    if (actorRole === RoleName.SALES_REPRESENTATIVE || actorRole === RoleName.SUPPORT_REPRESENTATIVE) {
      return { createdById: actorId };
    }
    return {};
  }

  async getMetrics(actorRole: RoleName, actorId: string, _actorTeamIds: string[]) {
    void _actorTeamIds;
    const custScope = this.customerScope(actorRole, actorId);
    const oppScope = this.opportunityScope(actorRole, actorId);
    const taskScope = this.taskScope(actorRole, actorId);
    const now = new Date();
    const periodStart = this.periodStart();
    const periodEnd = this.periodEnd();
    const yearStart = this.yearStart();
    const yearEnd = this.yearEnd();

    const [
      totalCustomers,
      newCustomersThisPeriod,
      activeOpportunities,
      wonThisPeriod,
      lostThisPeriod,
      pipelineAgg,
      forecastAgg,
      openTasks,
      overdueTasks,
    ] = await Promise.all([
      this.prisma.customer.count({
        where: { ...custScope, status: { not: 'ARCHIVED' } },
      }),
      this.prisma.customer.count({
        where: { ...custScope, createdAt: { gte: periodStart, lte: periodEnd } },
      }),
      this.prisma.opportunity.count({
        where: { ...oppScope, stage: { isTerminal: false } },
      }),
      this.prisma.opportunity.count({
        where: {
          ...oppScope,
          stage: { isTerminal: true, terminalOutcome: TerminalOutcome.WON },
          actualCloseDate: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.opportunity.count({
        where: {
          ...oppScope,
          stage: { isTerminal: true, terminalOutcome: TerminalOutcome.LOST },
          actualCloseDate: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.opportunity.aggregate({
        where: { ...oppScope, stage: { isTerminal: false } },
        _sum: { expectedRevenue: true },
      }),
      this.prisma.opportunity.aggregate({
        where: {
          ...oppScope,
          stage: { isTerminal: false },
          expectedCloseDate: { gte: yearStart, lte: yearEnd },
          probability: { not: null },
        },
        _sum: { expectedRevenue: true },
      }),
      this.prisma.task.count({
        where: { ...taskScope, status: 'OPEN' },
      }),
      this.prisma.task.count({
        where: { ...taskScope, status: 'OPEN', dueDate: { lt: now } },
      }),
    ]);

    const pipelineValue = pipelineAgg._sum.expectedRevenue
      ? String(pipelineAgg._sum.expectedRevenue)
      : '0.00';
    const revenueForecast = forecastAgg._sum.expectedRevenue
      ? String(forecastAgg._sum.expectedRevenue)
      : '0.00';

    return {
      totalCustomers,
      newCustomersThisPeriod,
      activeOpportunities,
      wonOpportunitiesThisPeriod: wonThisPeriod,
      lostOpportunitiesThisPeriod: lostThisPeriod,
      pipelineValue,
      revenueForecast,
      openTasks,
      overdueTasks,
      period: `${periodStart.toISOString()}/${periodEnd.toISOString()}`,
    };
  }

  async getRevenueTrend(months: number, actorRole: RoleName, actorId: string, _actorTeamIds: string[]) {
    void _actorTeamIds;
    const capped = Math.min(months, 24);
    const oppWhere = this.opportunityScope(actorRole, actorId);

    const now = new Date();
    const labels: string[] = [];
    const wonRevenue: number[] = [];
    const forecastRevenue: number[] = [];

    for (let i = capped - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      labels.push(label);

      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const [wonAgg] = await Promise.all([
        this.prisma.opportunity.aggregate({
          where: {
            ...oppWhere,
            stage: { isTerminal: true, terminalOutcome: TerminalOutcome.WON },
            actualCloseDate: { gte: monthStart, lte: monthEnd },
          },
          _sum: { expectedRevenue: true },
        }),
      ]);

      wonRevenue.push(Number(wonAgg._sum.expectedRevenue ?? 0));
      forecastRevenue.push(0);
    }

    return { labels, wonRevenue, forecastRevenue };
  }

  async getPipelineFunnel(actorRole: RoleName, actorId: string, _actorTeamIds: string[]) {
    void _actorTeamIds;
    const oppScope = this.opportunityScope(actorRole, actorId);

    const stages = await this.prisma.pipelineStage.findMany({
      where: { isTerminal: false },
      orderBy: { displayOrder: 'asc' },
    });

    const result = await Promise.all(
      stages.map(async (stage) => {
        const agg = await this.prisma.opportunity.aggregate({
          where: { ...oppScope, stageId: stage.id },
          _count: { id: true },
          _sum: { expectedRevenue: true },
        });
        return {
          stage: stage.name,
          count: agg._count.id,
          value: agg._sum.expectedRevenue ? String(agg._sum.expectedRevenue) : '0.00',
        };
      }),
    );

    return result;
  }

  async getActivityTrend(days: number, actorRole: RoleName, actorId: string, _actorTeamIds: string[]) {
    void _actorTeamIds;
    const capped = Math.min(days, 90);
    const actScope = this.activityScope(actorRole, actorId);

    const now = new Date();
    const labels: string[] = [];
    for (let i = capped - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(d.toISOString().split('T')[0]);
    }

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (capped - 1));
    startDate.setHours(0, 0, 0, 0);

    const activities = await this.prisma.activity.findMany({
      where: { ...actScope, createdAt: { gte: startDate } },
      select: { type: true, createdAt: true },
    });

    const counts: Record<string, Record<string, number>> = {};
    for (const label of labels) {
      counts[label] = { PHONE_CALL: 0, MEETING: 0, EMAIL: 0, NOTE: 0, FOLLOW_UP: 0 };
    }

    for (const a of activities) {
      const day = a.createdAt.toISOString().split('T')[0];
      if (counts[day]) {
        counts[day][a.type] = (counts[day][a.type] ?? 0) + 1;
      }
    }

    return {
      labels,
      phoneCall: labels.map((l) => counts[l]['PHONE_CALL'] ?? 0),
      meeting: labels.map((l) => counts[l]['MEETING'] ?? 0),
      email: labels.map((l) => counts[l]['EMAIL'] ?? 0),
      note: labels.map((l) => counts[l]['NOTE'] ?? 0),
      followUp: labels.map((l) => counts[l]['FOLLOW_UP'] ?? 0),
    };
  }

  async getTeamPerformance(actorRole: RoleName, actorId: string, _actorTeamIds: string[]) {
    void actorId; void _actorTeamIds;
    if (actorRole !== RoleName.SYSTEM_ADMINISTRATOR && actorRole !== RoleName.SALES_MANAGER) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Team performance requires Manager or Admin role' });
    }

    const now = new Date();
    const periodStart = this.periodStart();

    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true },
    });

    const result = await Promise.all(
      users.map(async (user) => {
        const [wonOpportunities, wonAgg, activitiesLogged, tasksCompleted, openOpportunities] = await Promise.all([
          this.prisma.opportunity.count({
            where: {
              ownerId: user.id,
              stage: { isTerminal: true, terminalOutcome: TerminalOutcome.WON },
              actualCloseDate: { gte: periodStart, lte: now },
            },
          }),
          this.prisma.opportunity.aggregate({
            where: {
              ownerId: user.id,
              stage: { isTerminal: true, terminalOutcome: TerminalOutcome.WON },
              actualCloseDate: { gte: periodStart, lte: now },
            },
            _sum: { expectedRevenue: true },
          }),
          this.prisma.activity.findMany({
            where: { createdById: user.id },
            select: { id: true },
          }),
          this.prisma.task.count({
            where: { assigneeId: user.id, status: 'COMPLETED' },
          }),
          this.prisma.opportunity.count({
            where: { ownerId: user.id, stage: { isTerminal: false } },
          }),
        ]);

        return {
          user: { id: user.id, firstName: user.firstName, lastName: user.lastName },
          wonOpportunities,
          wonRevenue: wonAgg._sum.expectedRevenue ? String(wonAgg._sum.expectedRevenue) : '0.00',
          activitiesLogged: activitiesLogged.length,
          tasksCompleted,
          openOpportunities,
        };
      }),
    );

    return result;
  }

  async getOpportunityDistribution(actorRole: RoleName, actorId: string, _actorTeamIds: string[]) {
    void _actorTeamIds;
    const oppScope = this.opportunityScope(actorRole, actorId);

    const ownerClause = oppScope['ownerId'] ? `AND o."ownerId" = '${String(oppScope['ownerId'])}'` : '';

    const rows = await this.prisma.$queryRaw<Array<{ industry: string | null; count: string; value: string }>>(
      Prisma.sql`
        SELECT c.industry, COUNT(o.id)::text AS count, COALESCE(SUM(o."expectedRevenue"), 0)::text AS value
        FROM opportunities o
        JOIN customers c ON o."customerId" = c.id
        JOIN pipeline_stages ps ON o."stageId" = ps.id
        WHERE o."deletedAt" IS NULL
          AND ps."isTerminal" = false
          ${Prisma.raw(ownerClause)}
        GROUP BY c.industry
        ORDER BY COUNT(o.id) DESC
      `,
    );

    return rows.map((r) => ({
      industry: r.industry ?? 'Unknown',
      count: Number(r.count),
      value: r.value,
    }));
  }
}
