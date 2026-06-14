import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VisibilityFilter } from '../../common/guards/visibility.guard';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private buildCustomerWhere(visibility: VisibilityFilter) {
    if (visibility.ownerId) return { ownerId: visibility.ownerId };
    if (visibility.ownerIdIn) return { ownerId: { in: visibility.ownerIdIn } };
    return {};
  }

  private buildOpportunityWhere(visibility: VisibilityFilter) {
    if (visibility.ownerId) return { ownerId: visibility.ownerId };
    if (visibility.ownerIdIn) return { ownerId: { in: visibility.ownerIdIn } };
    return {};
  }

  async getMetrics(visibility: VisibilityFilter) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const custWhere = this.buildCustomerWhere(visibility);
    const oppWhere = this.buildOpportunityWhere(visibility);

    const [
      totalCustomers,
      newCustomers,
      activeOpportunities,
      wonOpportunities,
      lostOpportunities,
      openTasks,
      overdueTasks,
      pipelineOpportunities,
    ] = await Promise.all([
      this.prisma.customer.count({ where: custWhere }),
      this.prisma.customer.count({
        where: {
          ...custWhere,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.opportunity.count({
        where: { ...oppWhere, actualCloseDate: null },
      }),
      this.prisma.opportunity.count({
        where: {
          ...oppWhere,
          stage: { terminalOutcome: 'WON' },
          actualCloseDate: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.opportunity.count({
        where: {
          ...oppWhere,
          stage: { terminalOutcome: 'LOST' },
          actualCloseDate: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.task.count({ where: { status: 'OPEN' } }),
      this.prisma.task.count({
        where: { status: 'OPEN', dueDate: { lt: now } },
      }),
      this.prisma.opportunity.findMany({
        where: { ...oppWhere, actualCloseDate: null },
        select: { expectedRevenue: true, probability: true },
      }),
    ]);

    const pipelineValue = pipelineOpportunities.reduce(
      (sum, o) => sum + Number(o.expectedRevenue ?? 0),
      0,
    );
    const revenueForcast = pipelineOpportunities.reduce(
      (sum, o) =>
        sum + (Number(o.expectedRevenue ?? 0) * (o.probability ?? 0)) / 100,
      0,
    );

    return {
      totalCustomers,
      newCustomersThisPeriod: newCustomers,
      activeOpportunities,
      wonOpportunitiesThisPeriod: wonOpportunities,
      lostOpportunitiesThisPeriod: lostOpportunities,
      pipelineValue: pipelineValue.toFixed(2),
      revenueForcast: revenueForcast.toFixed(2),
      openTasks,
      overdueTasks,
      period: `${periodStart.toISOString()}/${periodEnd.toISOString()}`,
    };
  }

  async getRevenueTrend(months = 6, visibility: VisibilityFilter) {
    const oppWhere = this.buildOpportunityWhere(visibility);
    const now = new Date();
    const labels: string[] = [];
    const wonRevenue: number[] = [];
    const forecastRevenue: number[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
      );
      const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      labels.push(label);

      const [wonOpps, openOpps] = await Promise.all([
        this.prisma.opportunity.findMany({
          where: {
            ...oppWhere,
            stage: { terminalOutcome: 'WON' },
            actualCloseDate: { gte: start, lte: end },
          },
          select: { expectedRevenue: true },
        }),
        this.prisma.opportunity.findMany({
          where: {
            ...oppWhere,
            actualCloseDate: null,
            expectedCloseDate: { gte: start, lte: end },
          },
          select: { expectedRevenue: true, probability: true },
        }),
      ]);

      wonRevenue.push(
        wonOpps.reduce((s, o) => s + Number(o.expectedRevenue ?? 0), 0),
      );
      forecastRevenue.push(
        openOpps.reduce(
          (s, o) =>
            s + (Number(o.expectedRevenue ?? 0) * (o.probability ?? 0)) / 100,
          0,
        ),
      );
    }

    return { labels, wonRevenue, forecastRevenue };
  }

  async getPipelineFunnel(visibility: VisibilityFilter) {
    const oppWhere = this.buildOpportunityWhere(visibility);
    const stages = await this.prisma.pipelineStage.findMany({
      where: { terminalOutcome: null },
      orderBy: { displayOrder: 'asc' },
    });

    const result = await Promise.all(
      stages.map(async (stage) => {
        const opps = await this.prisma.opportunity.findMany({
          where: { ...oppWhere, stageId: stage.id, actualCloseDate: null },
          select: { expectedRevenue: true },
        });
        const value = opps.reduce(
          (s, o) => s + Number(o.expectedRevenue ?? 0),
          0,
        );
        return {
          stage: stage.name,
          count: opps.length,
          value: value.toFixed(2),
        };
      }),
    );

    return result;
  }

  async getActivityTrend(days = 30, visibility: VisibilityFilter) {
    const custWhere = this.buildCustomerWhere(visibility);
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);

    const activities = await this.prisma.activity.findMany({
      where: {
        customer: custWhere,
        scheduledAt: { gte: start },
      },
      select: { type: true, scheduledAt: true },
    });

    const labels: string[] = [];
    const phoneCall: number[] = [];
    const meeting: number[] = [];
    const email: number[] = [];
    const note: number[] = [];
    const followUp: number[] = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const label = d.toISOString().slice(0, 10);
      labels.push(label);

      const dayActivities = activities.filter(
        (a) => a.scheduledAt?.toISOString().slice(0, 10) === label,
      );
      phoneCall.push(
        dayActivities.filter((a) => a.type === 'PHONE_CALL').length,
      );
      meeting.push(dayActivities.filter((a) => a.type === 'MEETING').length);
      email.push(dayActivities.filter((a) => a.type === 'EMAIL').length);
      note.push(dayActivities.filter((a) => a.type === 'NOTE').length);
      followUp.push(dayActivities.filter((a) => a.type === 'FOLLOW_UP').length);
    }

    return { labels, phoneCall, meeting, email, note, followUp };
  }

  async getTeamPerformance() {
    const users = await this.prisma.user.findMany({
      where: {
        role: { name: { in: ['SALES_REPRESENTATIVE', 'SALES_MANAGER'] } },
      },
      select: { id: true, firstName: true, lastName: true },
    });

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await Promise.all(
      users.map(async (user) => {
        const [wonOpps, openOpps, activities, tasks] = await Promise.all([
          this.prisma.opportunity.findMany({
            where: {
              ownerId: user.id,
              stage: { terminalOutcome: 'WON' },
              actualCloseDate: { gte: periodStart },
            },
            select: { expectedRevenue: true },
          }),
          this.prisma.opportunity.count({
            where: { ownerId: user.id, actualCloseDate: null },
          }),
          this.prisma.activity.count({
            where: { createdById: user.id, createdAt: { gte: periodStart } },
          }),
          this.prisma.task.count({
            where: {
              assigneeId: user.id,
              status: 'COMPLETED',
              completedAt: { gte: periodStart },
            },
          }),
        ]);

        const wonRevenue = wonOpps.reduce(
          (s, o) => s + Number(o.expectedRevenue ?? 0),
          0,
        );
        return {
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          wonOpportunities: wonOpps.length,
          wonRevenue: wonRevenue.toFixed(2),
          activitiesLogged: activities,
          tasksCompleted: tasks,
          openOpportunities: openOpps,
        };
      }),
    );

    return result;
  }

  async getOpportunityDistribution(visibility: VisibilityFilter) {
    const oppWhere = this.buildOpportunityWhere(visibility);
    const opps = await this.prisma.opportunity.findMany({
      where: { ...oppWhere, actualCloseDate: null },
      select: {
        expectedRevenue: true,
        customer: { select: { industry: true } },
      },
    });

    const map = new Map<string, { count: number; value: number }>();
    for (const opp of opps) {
      const industry = opp.customer?.industry ?? 'Unknown';
      const existing = map.get(industry) ?? { count: 0, value: 0 };
      map.set(industry, {
        count: existing.count + 1,
        value: existing.value + Number(opp.expectedRevenue ?? 0),
      });
    }

    return Array.from(map.entries())
      .map(([industry, { count, value }]) => ({
        industry,
        count,
        value: value.toFixed(2),
      }))
      .sort((a, b) => b.count - a.count);
  }
}
