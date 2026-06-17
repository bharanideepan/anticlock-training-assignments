import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface ActorPayload {
  sub: string;
  email: string;
  role: RoleName;
  teamIds: string[];
}

const ALL_ROLES = [
  RoleName.SYSTEM_ADMINISTRATOR,
  RoleName.SALES_MANAGER,
  RoleName.SALES_REPRESENTATIVE,
  RoleName.SUPPORT_REPRESENTATIVE,
  RoleName.READ_ONLY,
];

const MANAGER_UP = [RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER];

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @Roles(...ALL_ROLES)
  async getMetrics(@CurrentUser() actor: ActorPayload): Promise<{ data: unknown }> {
    const metrics = await this.dashboardService.getMetrics(actor.role, actor.sub, actor.teamIds);
    return { data: metrics };
  }

  @Get('charts/revenue-trend')
  @Roles(...ALL_ROLES)
  async getRevenueTrend(
    @Query() query: { months?: number },
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const months = Number(query.months ?? 6);
    const data = await this.dashboardService.getRevenueTrend(months, actor.role, actor.sub, actor.teamIds);
    return { data };
  }

  @Get('charts/pipeline-funnel')
  @Roles(...ALL_ROLES)
  async getPipelineFunnel(@CurrentUser() actor: ActorPayload): Promise<{ data: unknown }> {
    const data = await this.dashboardService.getPipelineFunnel(actor.role, actor.sub, actor.teamIds);
    return { data };
  }

  @Get('charts/activity-trend')
  @Roles(...ALL_ROLES)
  async getActivityTrend(
    @Query() query: { days?: number },
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const days = Number(query.days ?? 30);
    const data = await this.dashboardService.getActivityTrend(days, actor.role, actor.sub, actor.teamIds);
    return { data };
  }

  @Get('charts/team-performance')
  @Roles(...MANAGER_UP)
  async getTeamPerformance(@CurrentUser() actor: ActorPayload): Promise<{ data: unknown }> {
    const data = await this.dashboardService.getTeamPerformance(actor.role, actor.sub, actor.teamIds);
    return { data };
  }

  @Get('charts/opportunity-distribution')
  @Roles(...ALL_ROLES)
  async getOpportunityDistribution(@CurrentUser() actor: ActorPayload): Promise<{ data: unknown }> {
    const data = await this.dashboardService.getOpportunityDistribution(actor.role, actor.sub, actor.teamIds);
    return { data };
  }
}
