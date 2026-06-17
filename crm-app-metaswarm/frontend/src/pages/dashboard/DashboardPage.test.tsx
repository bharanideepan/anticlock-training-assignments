import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DashboardPage from './DashboardPage';
import * as api from '../../api/dashboard';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/dashboard');

vi.mock('recharts', () => ({
  LineChart: () => null, Line: () => null, BarChart: () => null, Bar: () => null,
  PieChart: () => null, Pie: () => null, Cell: () => null,
  XAxis: () => null, YAxis: () => null, Tooltip: () => null, Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockMetrics = {
  totalCustomers: 150, newCustomersThisPeriod: 12, activeOpportunities: 45,
  wonOpportunitiesThisPeriod: 5, lostOpportunitiesThisPeriod: 2,
  pipelineValue: '500000.00', revenueForecast: '120000.00',
  openTasks: 30, overdueTasks: 5, period: '2026-06-01T00:00:00Z/2026-06-30T23:59:59Z',
};

const adminCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
};

const repCtx: AuthContextValue = {
  ...adminCtx, user: { ...adminCtx.user!, role: 'SALES_REPRESENTATIVE' },
};

function renderPage(authCtx = adminCtx) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter><DashboardPage /></MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(api.useDashboardMetrics).mockReturnValue({
      data: mockMetrics, isLoading: false,
    } as unknown as ReturnType<typeof api.useDashboardMetrics>);
    vi.mocked(api.useRevenueTrend).mockReturnValue({
      data: { labels: ['2026-01'], wonRevenue: [0], forecastRevenue: [0] }, isLoading: false,
    } as unknown as ReturnType<typeof api.useRevenueTrend>);
    vi.mocked(api.usePipelineFunnel).mockReturnValue({
      data: [{ stage: 'Lead', count: 10, value: '100000' }], isLoading: false,
    } as unknown as ReturnType<typeof api.usePipelineFunnel>);
    vi.mocked(api.useActivityTrend).mockReturnValue({
      data: { labels: ['2026-06-01'], phoneCall: [1], meeting: [0], email: [2], note: [0], followUp: [0] },
      isLoading: false,
    } as unknown as ReturnType<typeof api.useActivityTrend>);
    vi.mocked(api.useTeamPerformance).mockReturnValue({
      data: [{ user: { id: 'u1', firstName: 'Jane', lastName: 'Doe' }, wonOpportunities: 3, wonRevenue: '50000', activitiesLogged: 10, tasksCompleted: 5, openOpportunities: 8 }],
      isLoading: false,
    } as unknown as ReturnType<typeof api.useTeamPerformance>);
    vi.mocked(api.useOpportunityDistribution).mockReturnValue({
      data: [{ industry: 'Technology', count: 10, value: '500000' }], isLoading: false,
    } as unknown as ReturnType<typeof api.useOpportunityDistribution>);
  });

  it('renders dashboard heading', () => {
    renderPage();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders KPI cards with metrics', () => {
    renderPage();
    expect(screen.getByText('Total Customers')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Active Opportunities')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('shows team performance section for admin', () => {
    renderPage();
    expect(screen.getByText('Team Performance')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('hides team performance section for SALES_REPRESENTATIVE', () => {
    renderPage(repCtx);
    expect(screen.queryByText('Team Performance')).not.toBeInTheDocument();
  });

  it('shows loading spinner for metrics', () => {
    vi.mocked(api.useDashboardMetrics).mockReturnValue({
      data: undefined, isLoading: true,
    } as unknown as ReturnType<typeof api.useDashboardMetrics>);
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty state for pipeline funnel', () => {
    vi.mocked(api.usePipelineFunnel).mockReturnValue({
      data: [], isLoading: false,
    } as unknown as ReturnType<typeof api.usePipelineFunnel>);
    renderPage();
    expect(screen.getByText(/no active opportunities in the pipeline/i)).toBeInTheDocument();
  });
});
