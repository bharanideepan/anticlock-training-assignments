import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import OpportunityListPage from './OpportunityListPage';
import * as api from '../../api/opportunities';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/opportunities');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockOpp = {
  id: 'opp-1', name: 'Big Deal', customerId: 'c1', ownerId: 'u1', stageId: 's1',
  stage: { id: 's1', name: 'Lead', displayOrder: 1, isTerminal: false, terminalOutcome: null },
  customer: { id: 'c1', companyName: 'Acme Corp' },
  contact: null,
  owner: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
  _count: { tasks: 0 },
  expectedRevenue: '50000.00', expectedCloseDate: '2026-12-31T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

const adminCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
};

const readOnlyCtx: AuthContextValue = { ...adminCtx, user: { ...adminCtx.user!, role: 'READ_ONLY' } };

function renderPage(authCtx = adminCtx) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter><OpportunityListPage /></MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('OpportunityListPage', () => {
  beforeEach(() => {
    vi.mocked(api.useOpportunities).mockReturnValue({
      data: { data: [mockOpp], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } },
      isLoading: false,
    } as unknown as ReturnType<typeof api.useOpportunities>);
    mockNavigate.mockClear();
  });

  it('renders opportunity table', () => {
    renderPage();
    expect(screen.getByText('Big Deal')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows New Opportunity button for admin', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /new opportunity/i })).toBeInTheDocument();
  });

  it('hides New Opportunity button for READ_ONLY', () => {
    renderPage(readOnlyCtx);
    expect(screen.queryByRole('button', { name: /new opportunity/i })).not.toBeInTheDocument();
  });

  it('navigates to /opportunities/new on button click', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /new opportunity/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/opportunities/new');
  });

  it('navigates to opportunity detail on row click', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Big Deal'));
    expect(mockNavigate).toHaveBeenCalledWith('/opportunities/opp-1');
  });

  it('shows loading spinner', () => {
    vi.mocked(api.useOpportunities).mockReturnValue({
      data: undefined, isLoading: true,
    } as unknown as ReturnType<typeof api.useOpportunities>);
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows No opportunities found when empty', () => {
    vi.mocked(api.useOpportunities).mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      isLoading: false,
    } as unknown as ReturnType<typeof api.useOpportunities>);
    renderPage();
    expect(screen.getByText(/no opportunities found/i)).toBeInTheDocument();
  });
});
