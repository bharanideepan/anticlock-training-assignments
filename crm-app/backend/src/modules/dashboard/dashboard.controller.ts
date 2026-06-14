import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  VisibilityGuard,
  RequestWithVisibility,
} from '../../common/guards/visibility.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(VisibilityGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  getMetrics(@Request() req: RequestWithVisibility) {
    return this.dashboardService.getMetrics(req.visibilityFilter);
  }

  @Get('charts/revenue-trend')
  getRevenueTrend(
    @Query('months') months: string,
    @Request() req: RequestWithVisibility,
  ) {
    return this.dashboardService.getRevenueTrend(
      months ? Number(months) : 6,
      req.visibilityFilter,
    );
  }

  @Get('charts/pipeline-funnel')
  getPipelineFunnel(@Request() req: RequestWithVisibility) {
    return this.dashboardService.getPipelineFunnel(req.visibilityFilter);
  }

  @Get('charts/activity-trend')
  getActivityTrend(
    @Query('days') days: string,
    @Request() req: RequestWithVisibility,
  ) {
    return this.dashboardService.getActivityTrend(
      days ? Number(days) : 30,
      req.visibilityFilter,
    );
  }

  @Get('charts/team-performance')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR, RoleName.SALES_MANAGER)
  getTeamPerformance() {
    return this.dashboardService.getTeamPerformance();
  }

  @Get('charts/opportunity-distribution')
  getOpportunityDistribution(@Request() req: RequestWithVisibility) {
    return this.dashboardService.getOpportunityDistribution(
      req.visibilityFilter,
    );
  }
}
