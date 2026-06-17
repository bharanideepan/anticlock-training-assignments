import { Test, TestingModule } from '@nestjs/testing';
import { RoleName } from '@prisma/client';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockDashboardService = {
  getMetrics: jest.fn(),
  getRevenueTrend: jest.fn(),
  getPipelineFunnel: jest.fn(),
  getActivityTrend: jest.fn(),
  getTeamPerformance: jest.fn(),
  getOpportunityDistribution: jest.fn(),
};

const adminActor = { sub: 'admin-id', email: 'a@b.com', role: RoleName.SYSTEM_ADMINISTRATOR, teamIds: [] as string[] };

describe('DashboardController', () => {
  let controller: DashboardController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: mockDashboardService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get<DashboardController>(DashboardController);
  });

  it('GET /dashboard/metrics — returns metrics envelope', async () => {
    const mockMetrics = { totalCustomers: 100, openTasks: 10 };
    mockDashboardService.getMetrics.mockResolvedValue(mockMetrics);
    const result = await controller.getMetrics(adminActor as never);
    expect(result).toEqual({ data: mockMetrics });
  });

  it('GET /dashboard/charts/revenue-trend — returns trend data', async () => {
    const mockTrend = { labels: [], wonRevenue: [], forecastRevenue: [] };
    mockDashboardService.getRevenueTrend.mockResolvedValue(mockTrend);
    const result = await controller.getRevenueTrend({ months: 6 }, adminActor as never);
    expect(result).toEqual({ data: mockTrend });
    expect(mockDashboardService.getRevenueTrend).toHaveBeenCalledWith(6, adminActor.role, adminActor.sub, adminActor.teamIds);
  });

  it('GET /dashboard/charts/pipeline-funnel — returns funnel data', async () => {
    const mockFunnel = [{ stage: 'Lead', count: 5, value: '100000' }];
    mockDashboardService.getPipelineFunnel.mockResolvedValue(mockFunnel);
    const result = await controller.getPipelineFunnel(adminActor as never);
    expect(result).toEqual({ data: mockFunnel });
  });

  it('GET /dashboard/charts/activity-trend — returns trend data', async () => {
    const mockTrend = { labels: [], phoneCall: [], meeting: [], email: [], note: [], followUp: [] };
    mockDashboardService.getActivityTrend.mockResolvedValue(mockTrend);
    const result = await controller.getActivityTrend({ days: 30 }, adminActor as never);
    expect(result).toEqual({ data: mockTrend });
  });

  it('GET /dashboard/charts/team-performance — returns team data', async () => {
    const mockTeam = [{ user: { id: 'u1' }, wonOpportunities: 5 }];
    mockDashboardService.getTeamPerformance.mockResolvedValue(mockTeam);
    const result = await controller.getTeamPerformance(adminActor as never);
    expect(result).toEqual({ data: mockTeam });
  });

  it('GET /dashboard/charts/opportunity-distribution — returns distribution data', async () => {
    const mockDist = [{ industry: 'Tech', count: 10, value: '500000' }];
    mockDashboardService.getOpportunityDistribution.mockResolvedValue(mockDist);
    const result = await controller.getOpportunityDistribution(adminActor as never);
    expect(result).toEqual({ data: mockDist });
  });
});
