import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import OpportunityDetailPage from './OpportunityDetailPage';
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
  _count: { tasks: 2 },
  expectedRevenue: '50000.00', probability: 60,
  expectedCloseDate: '2026-12-31T00:00:00Z', actualCloseDate: null, closeNote: null,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

const mockMutation = {
  mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, isPaused: false,
  isSuccess: false, isError: false, isIdle: true, data: undefined, error: null,
  reset: vi.fn(), context: undefined, failureCount: 0, failureReason: null,
  status: 'idle' as const, submittedAt: 0, variables: undefined,
};

const adminCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
};

const readOnlyCtx: AuthContextValue = {
  ...adminCtx, user: { ...adminCtx.user!, id: 'other', role: 'READ_ONLY' },
};

function renderPage(authCtx = adminCtx) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={['/opportunities/opp-1']}>
          <Routes><Route path="/opportunities/:id" element={<OpportunityDetailPage />} /></Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('OpportunityDetailPage', () => {
  beforeEach(() => {
    vi.mocked(api.useOpportunity).mockReturnValue({
      data: mockOpp, isLoading: false,
    } as unknown as ReturnType<typeof api.useOpportunity>);
    vi.mocked(api.useCloseWon).mockReturnValue(
      mockMutation as unknown as ReturnType<typeof api.useCloseWon>,
    );
    vi.mocked(api.useCloseLost).mockReturnValue(
      mockMutation as unknown as ReturnType<typeof api.useCloseLost>,
    );
    mockNavigate.mockClear();
    vi.mocked(mockMutation.mutate).mockClear();
  });

  it('renders opportunity name', () => {
    renderPage();
    expect(screen.getByText('Big Deal')).toBeInTheDocument();
  });

  it('shows stage chip', () => {
    renderPage();
    expect(screen.getByText('Lead')).toBeInTheDocument();
  });

  it('shows Close Won button for owner (admin)', () => {
    renderPage(adminCtx);
    expect(screen.getByRole('button', { name: /close won/i })).toBeInTheDocument();
  });

  it('hides Close Won button for READ_ONLY non-owner', () => {
    renderPage(readOnlyCtx);
    expect(screen.queryByRole('button', { name: /close won/i })).not.toBeInTheDocument();
  });

  it('calls closeWon mutation on Close Won button click', async () => {
    renderPage(adminCtx);
    await userEvent.click(screen.getByRole('button', { name: /close won/i }));
    expect(mockMutation.mutate).toHaveBeenCalled();
  });

  it('hides action buttons when opportunity is terminal', () => {
    vi.mocked(api.useOpportunity).mockReturnValue({
      data: { ...mockOpp, stage: { ...mockOpp.stage, isTerminal: true } },
      isLoading: false,
    } as unknown as ReturnType<typeof api.useOpportunity>);
    renderPage(adminCtx);
    expect(screen.queryByRole('button', { name: /close won/i })).not.toBeInTheDocument();
  });

  it('shows task count', () => {
    renderPage();
    expect(screen.getByText(/tasks: 2/i)).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    vi.mocked(api.useOpportunity).mockReturnValue({
      data: undefined, isLoading: true,
    } as unknown as ReturnType<typeof api.useOpportunity>);
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('returns null when opportunity is undefined', () => {
    vi.mocked(api.useOpportunity).mockReturnValue({
      data: undefined, isLoading: false,
    } as unknown as ReturnType<typeof api.useOpportunity>);
    renderPage();
    expect(screen.queryByText('Big Deal')).not.toBeInTheDocument();
  });
});
