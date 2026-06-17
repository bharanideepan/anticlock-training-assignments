import { render, screen } from '@testing-library/react';

vi.mock('@mui/icons-material/Download', () => ({ default: () => null }));
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ReportPage from './ReportPage';
import * as reportsApi from '../../api/reports';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/reports');

const authCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SALES_MANAGER' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
};

const emptyRevenue = { totalWonRevenue: '0.00', totalForecastRevenue: '0.00', byPeriod: [] };
const emptyWinRate = { totalClosed: 0, totalWon: 0, totalLost: 0, winRate: 0, byOwner: [] };
const emptyDist = { byStatus: [], byRevenueRange: [] };
const emptyGrowth = { byPeriod: [] };
const emptyConversion = { totalLeads: 0, closedWon: 0, leadToWinRate: 0 };
const emptyTask = { totalTasks: 0, completed: 0, cancelled: 0, overdue: 0, completionRate: 0, byAssignee: [] };

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter>
          <ReportPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ReportPage', () => {
  beforeEach(() => {
    vi.mocked(reportsApi.useSalesRevenue).mockReturnValue({ data: emptyRevenue, isLoading: false } as never);
    vi.mocked(reportsApi.useSalesWinRate).mockReturnValue({ data: emptyWinRate, isLoading: false } as never);
    vi.mocked(reportsApi.useSalesConversionRate).mockReturnValue({ data: emptyConversion, isLoading: false } as never);
    vi.mocked(reportsApi.useCustomersGrowth).mockReturnValue({ data: emptyGrowth, isLoading: false } as never);
    vi.mocked(reportsApi.useCustomersDistribution).mockReturnValue({ data: emptyDist, isLoading: false } as never);
    vi.mocked(reportsApi.useProductivityTaskCompletion).mockReturnValue({ data: emptyTask, isLoading: false } as never);
  });

  it('renders Reports & Analytics heading', () => {
    renderPage();
    expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
  });

  it('renders category tabs', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'Sales' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Customer' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'User Productivity' })).toBeInTheDocument();
  });

  it('renders date filter inputs', () => {
    renderPage();
    expect(screen.getByLabelText(/from date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to date/i)).toBeInTheDocument();
  });

  it('renders Export CSV button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('renders revenue performance sub-report by default', () => {
    renderPage();
    expect(screen.getByText('Revenue Performance')).toBeInTheDocument();
  });

  it('shows report data when available', () => {
    renderPage();
    expect(screen.getByText(/report data/i)).toBeInTheDocument();
  });
});
