import { Test } from '@nestjs/testing';
import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { RoleName } from '@prisma/client';

const mockReportsService = {
  salesRevenue: jest.fn(),
  salesWinRate: jest.fn(),
  salesConversionRate: jest.fn(),
  salesOpportunityTrends: jest.fn(),
  customersGrowth: jest.fn(),
  customersDistribution: jest.fn(),
  customersIndustryAnalysis: jest.fn(),
  productivityActivityCompletion: jest.fn(),
  productivityTaskCompletion: jest.fn(),
  productivityOpportunityOwnership: jest.fn(),
  exportCsv: jest.fn(),
};

const adminActor = {
  sub: 'user-1', email: 'admin@test.com', role: RoleName.SYSTEM_ADMINISTRATOR, teamIds: [],
};

const BASE_QUERY = 'fromDate=2026-01-01&toDate=2026-12-31';

describe('ReportsController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockReportsService.salesRevenue.mockResolvedValue({ totalWonRevenue: '0.00', totalForecastRevenue: '0.00', byPeriod: [] });
    mockReportsService.salesWinRate.mockResolvedValue({ totalClosed: 0, totalWon: 0, totalLost: 0, winRate: 0, byOwner: [] });
    mockReportsService.customersDistribution.mockResolvedValue({ byStatus: [], byRevenueRange: [] });
    mockReportsService.exportCsv.mockResolvedValue('header\nrow1');

    const module = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: mockReportsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (ctx: ExecutionContext) => {
        ctx.switchToHttp().getRequest().user = adminActor;
        return true;
      }})
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(() => app.close());

  it('GET /reports/sales/revenue returns 200', async () => {
    const res = await request(app.getHttpServer()).get(`/reports/sales/revenue?${BASE_QUERY}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalWonRevenue');
  });

  it('GET /reports/sales/win-rate returns 200', async () => {
    const res = await request(app.getHttpServer()).get(`/reports/sales/win-rate?${BASE_QUERY}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('winRate');
  });

  it('GET /reports/customers/distribution returns 200', async () => {
    const res = await request(app.getHttpServer()).get(`/reports/customers/distribution?${BASE_QUERY}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('byStatus');
  });

  it('GET /reports/:reportType/export returns CSV', async () => {
    const res = await request(app.getHttpServer()).get(`/reports/sales-revenue/export?${BASE_QUERY}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toBe('header\nrow1');
  });

  it('GET /reports/sales/revenue returns 400 when fromDate is missing', async () => {
    const res = await request(app.getHttpServer()).get('/reports/sales/revenue?toDate=2026-12-31');
    expect(res.status).toBe(400);
  });
});
