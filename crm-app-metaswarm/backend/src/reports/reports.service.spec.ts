import { Test } from '@nestjs/testing';
import { RoleName, TerminalOutcome } from '@prisma/client';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  $queryRaw: jest.fn(),
  opportunity: {
    aggregate: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  customer: {
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  activity: {
    count: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  task: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
};

const adminActor = {
  sub: 'user-1', email: 'admin@test.com', role: RoleName.SYSTEM_ADMINISTRATOR, teamIds: [] as string[],
};
const managerActor = {
  sub: 'mgr-1', email: 'mgr@test.com', role: RoleName.SALES_MANAGER, teamIds: ['team-1'],
};
const repActor = {
  sub: 'rep-1', email: 'rep@test.com', role: RoleName.SALES_REPRESENTATIVE, teamIds: [] as string[],
};

const baseQuery = { fromDate: '2026-01-01', toDate: '2026-12-31' };

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(ReportsService);
  });

  describe('salesRevenue', () => {
    it('returns total won and forecast revenue', async () => {
      mockPrisma.opportunity.aggregate
        .mockResolvedValueOnce({ _sum: { expectedRevenue: '1250000' } }) // won
        .mockResolvedValueOnce({ _sum: { expectedRevenue: null } }); // active
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.salesRevenue(adminActor, baseQuery);

      expect(result).toHaveProperty('totalWonRevenue');
      expect(result).toHaveProperty('totalForecastRevenue');
      expect(result).toHaveProperty('byPeriod');
      expect(result.totalWonRevenue).toBe('1250000.00');
    });

    it('REP sees only own opportunities', async () => {
      mockPrisma.opportunity.aggregate.mockResolvedValue({ _sum: { expectedRevenue: null } });
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await service.salesRevenue(repActor, baseQuery);

      expect(mockPrisma.opportunity.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ ownerId: repActor.sub }) }),
      );
    });
  });

  describe('salesWinRate', () => {
    it('calculates win rate from won and lost counts', async () => {
      mockPrisma.opportunity.count
        .mockResolvedValueOnce(28) // won
        .mockResolvedValueOnce(17); // lost
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.salesWinRate(adminActor, baseQuery);

      expect(result.totalWon).toBe(28);
      expect(result.totalLost).toBe(17);
      expect(result.totalClosed).toBe(45);
      expect(result.winRate).toBeCloseTo(62.2, 1);
    });
  });

  describe('salesConversionRate', () => {
    it('returns conversion funnel data', async () => {
      mockPrisma.opportunity.count
        .mockResolvedValueOnce(120) // lead
        .mockResolvedValueOnce(80)  // qualified
        .mockResolvedValueOnce(55)  // proposal
        .mockResolvedValueOnce(38)  // negotiation
        .mockResolvedValueOnce(28); // won
      mockPrisma.opportunity.findMany.mockResolvedValue([]);

      const result = await service.salesConversionRate(adminActor, baseQuery);

      expect(result.totalLeads).toBe(120);
      expect(result.closedWon).toBe(28);
      expect(result.leadToWinRate).toBeCloseTo(23.3, 1);
    });
  });

  describe('customersGrowth', () => {
    it('returns byPeriod growth data', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { period: '2026-04', new: BigInt(12), churned: BigInt(2) },
      ]);

      const result = await service.customersGrowth(adminActor, baseQuery);

      expect(result.byPeriod).toHaveLength(1);
      expect(result.byPeriod[0]).toMatchObject({ period: '2026-04', new: 12, churned: 2, net: 10 });
    });
  });

  describe('customersDistribution', () => {
    it('returns by-status and by-revenue-range counts', async () => {
      mockPrisma.customer.groupBy
        .mockResolvedValueOnce([
          { status: 'ACTIVE', _count: { id: 842 } },
          { status: 'PROSPECT', _count: { id: 340 } },
        ])
        .mockResolvedValueOnce([
          { revenueRange: '10M_50M', _count: { id: 320 } },
        ]);

      const result = await service.customersDistribution(adminActor, baseQuery);

      expect(result.byStatus).toHaveLength(2);
      expect(result.byStatus[0]).toMatchObject({ status: 'ACTIVE', count: 842 });
      expect(result.byRevenueRange).toHaveLength(1);
    });
  });

  describe('productivityActivityCompletion', () => {
    it('returns total and by-type breakdown', async () => {
      mockPrisma.activity.count.mockResolvedValue(620);
      mockPrisma.activity.groupBy.mockResolvedValue([
        { type: 'PHONE_CALL', _count: { id: 185 } },
        { type: 'MEETING', _count: { id: 94 } },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.productivityActivityCompletion(adminActor, baseQuery);

      expect(result.totalActivities).toBe(620);
      expect(result.byType).toHaveLength(2);
      expect(result.byType[0]).toMatchObject({ type: 'PHONE_CALL', count: 185 });
    });
  });

  describe('productivityTaskCompletion', () => {
    it('returns task completion stats', async () => {
      mockPrisma.task.count
        .mockResolvedValueOnce(310) // total
        .mockResolvedValueOnce(248) // completed
        .mockResolvedValueOnce(18)  // cancelled
        .mockResolvedValueOnce(14); // overdue
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.productivityTaskCompletion(adminActor, baseQuery);

      expect(result.totalTasks).toBe(310);
      expect(result.completed).toBe(248);
      expect(result.completionRate).toBeCloseTo(80.0, 1);
    });
  });

  describe('exportCsv', () => {
    it('returns CSV string for sales-revenue report type', async () => {
      mockPrisma.opportunity.aggregate.mockResolvedValue({ _sum: { expectedRevenue: null } });
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const csv = await service.exportCsv('sales-revenue', adminActor, baseQuery);

      expect(typeof csv).toBe('string');
      expect(csv).toContain('totalWonRevenue');
    });
  });
});
