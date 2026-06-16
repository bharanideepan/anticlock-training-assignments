import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import OpportunityFormPage from './OpportunityFormPage';
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
  contact: null, owner: { id: 'u1', firstName: 'Jane', lastName: 'Doe' }, _count: { tasks: 0 },
  expectedRevenue: '50000.00', probability: 60, expectedCloseDate: '2026-12-31T00:00:00Z',
  actualCloseDate: null, closeNote: null,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

function makeMutation(overrides = {}) {
  return {
    mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue(mockOpp), isPending: false,
    isPaused: false, isSuccess: false, isError: false, isIdle: true, data: undefined,
    error: null, reset: vi.fn(), context: undefined, failureCount: 0, failureReason: null,
    status: 'idle' as const, submittedAt: 0, variables: undefined, ...overrides,
  };
}

const authCtx: AuthContextValue = {
  user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
};

function renderCreatePage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={['/opportunities/new']}>
          <Routes><Route path="/opportunities/new" element={<OpportunityFormPage />} /></Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function renderEditPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={['/opportunities/opp-1/edit']}>
          <Routes><Route path="/opportunities/:id/edit" element={<OpportunityFormPage />} /></Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('OpportunityFormPage — Create', () => {
  beforeEach(() => {
    vi.mocked(api.useCreateOpportunity).mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof api.useCreateOpportunity>,
    );
    mockNavigate.mockClear();
  });

  it('renders New Opportunity heading', () => {
    renderCreatePage();
    expect(screen.getByRole('heading', { name: 'New Opportunity' })).toBeInTheDocument();
  });

  it('shows validation error for missing name', async () => {
    renderCreatePage();
    await userEvent.click(screen.getByRole('button', { name: /create opportunity/i }));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });
});

describe('OpportunityFormPage — Edit', () => {
  beforeEach(() => {
    vi.mocked(api.useOpportunity).mockReturnValue({
      data: mockOpp, isLoading: false,
    } as unknown as ReturnType<typeof api.useOpportunity>);
    vi.mocked(api.useUpdateOpportunity).mockReturnValue(
      makeMutation() as unknown as ReturnType<typeof api.useUpdateOpportunity>,
    );
    mockNavigate.mockClear();
  });

  it('renders Edit Opportunity heading', () => {
    renderEditPage();
    expect(screen.getByRole('heading', { name: 'Edit Opportunity' })).toBeInTheDocument();
  });

  it('pre-populates with existing name', async () => {
    renderEditPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Big Deal')).toBeInTheDocument();
    });
  });

  it('submits and navigates to opportunity detail', async () => {
    renderEditPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/opportunities/opp-1');
    });
  });

  it('returns null when opportunity is undefined', () => {
    vi.mocked(api.useOpportunity).mockReturnValue({
      data: undefined, isLoading: false,
    } as unknown as ReturnType<typeof api.useOpportunity>);
    renderEditPage();
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
  });
});
