import { Test, TestingModule } from '@nestjs/testing';
import { RoleName } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  customer: { count: jest.fn(), aggregate: jest.fn() },
  opportunity: { count: jest.fn(), aggregate: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
  pipelineStage: { findMany: jest.fn() },
  task: { count: jest.fn() },
  activity: { findMany: jest.fn() },
  user: { findMany: jest.fn() },
  $queryRaw: jest.fn(),
};

const ADMIN = RoleName.SYSTEM_ADMINISTRATOR;
const MANAGER = RoleName.SALES_MANAGER;
const REP = RoleName.SALES_REPRESENTATIVE;

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<DashboardService>(DashboardService);
  });

  describe('getMetrics', () => {
    it('returns metrics object for admin', async () => {
      mockPrisma.customer.count.mockResolvedValue(100);
      mockPrisma.opportunity.count.mockResolvedValue(50);
      mockPrisma.opportunity.aggregate.mockResolvedValue({ _sum: { expectedRevenue: '500000' } });
      mockPrisma.task.count.mockResolvedValue(20);
      const result = await service.getMetrics(ADMIN, 'admin-id', []);
      expect(result).toMatchObject({
        totalCustomers: expect.any(Number),
        newCustomersThisPeriod: expect.any(Number),
        activeOpportunities: expect.any(Number),
        wonOpportunitiesThisPeriod: expect.any(Number),
        lostOpportunitiesThisPeriod: expect.any(Number),
        pipelineValue: expect.any(String),
        revenueForecast: expect.any(String),
        openTasks: expect.any(Number),
        overdueTasks: expect.any(Number),
        period: expect.any(String),
      });
    });

    it('scopes customer count for SALES_REPRESENTATIVE', async () => {
      mockPrisma.customer.count.mockResolvedValue(5);
      mockPrisma.opportunity.count.mockResolvedValue(3);
      mockPrisma.opportunity.aggregate.mockResolvedValue({ _sum: { expectedRevenue: null } });
      mockPrisma.task.count.mockResolvedValue(2);
      await service.getMetrics(REP, 'rep-id', []);
      expect(mockPrisma.customer.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ ownerId: 'rep-id' }) }),
      );
    });
  });

  describe('getRevenueTrend', () => {
    it('returns revenue trend data', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      const result = await service.getRevenueTrend(6, ADMIN, 'admin-id', []);
      expect(result).toMatchObject({
        labels: expect.any(Array),
        wonRevenue: expect.any(Array),
        forecastRevenue: expect.any(Array),
      });
      expect(result.labels).toHaveLength(6);
    });

    it('caps months at 24', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      const result = await service.getRevenueTrend(30, ADMIN, 'admin-id', []);
      expect(result.labels).toHaveLength(24);
    });
  });

  describe('getPipelineFunnel', () => {
    it('returns pipeline funnel data', async () => {
      mockPrisma.pipelineStage.findMany.mockResolvedValue([
        { id: 's1', name: 'Lead', displayOrder: 1 },
        { id: 's2', name: 'Qualified', displayOrder: 2 },
      ]);
      mockPrisma.opportunity.aggregate.mockResolvedValue({ _count: { id: 5 }, _sum: { expectedRevenue: '250000' } });
      const result = await service.getPipelineFunnel(ADMIN, 'admin-id', []);
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toMatchObject({ stage: expect.any(String), count: expect.any(Number), value: expect.any(String) });
    });
  });

  describe('getActivityTrend', () => {
    it('returns activity trend data with correct structure', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      const result = await service.getActivityTrend(30, ADMIN, 'admin-id', []);
      expect(result).toMatchObject({
        labels: expect.any(Array),
        phoneCall: expect.any(Array),
        meeting: expect.any(Array),
        email: expect.any(Array),
        note: expect.any(Array),
        followUp: expect.any(Array),
      });
      expect(result.labels).toHaveLength(30);
    });

    it('caps days at 90', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      const result = await service.getActivityTrend(120, ADMIN, 'admin-id', []);
      expect(result.labels).toHaveLength(90);
    });
  });

  describe('getTeamPerformance', () => {
    it('returns team performance for admin', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
      ]);
      mockPrisma.opportunity.count.mockResolvedValue(5);
      mockPrisma.opportunity.aggregate.mockResolvedValue({ _sum: { expectedRevenue: '100000' } });
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(10);
      const result = await service.getTeamPerformance(ADMIN, 'admin-id', []);
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toMatchObject({
        user: expect.objectContaining({ id: 'u1' }),
        wonOpportunities: expect.any(Number),
        wonRevenue: expect.any(String),
        activitiesLogged: expect.any(Number),
        tasksCompleted: expect.any(Number),
        openOpportunities: expect.any(Number),
      });
    });

    it('throws ForbiddenException for SALES_REPRESENTATIVE', async () => {
      const { ForbiddenException } = await import('@nestjs/common');
      await expect(service.getTeamPerformance(REP, 'rep-id', [])).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getOpportunityDistribution', () => {
    it('returns opportunity distribution by industry', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { industry: 'Technology', count: '10', value: '500000' },
      ]);
      const result = await service.getOpportunityDistribution(ADMIN, 'admin-id', []);
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toMatchObject({
        industry: 'Technology',
        count: expect.any(Number),
        value: expect.any(String),
      });
    });
  });
});
