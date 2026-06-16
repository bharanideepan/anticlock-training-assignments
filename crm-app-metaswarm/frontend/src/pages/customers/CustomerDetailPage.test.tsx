import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CustomerDetailPage from './CustomerDetailPage';
import * as customersApi from '../../api/customers';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/customers');

const mockCustomer = {
  id: 'c1',
  companyName: 'Acme Corp',
  industry: 'Technology',
  website: 'https://acme.com',
  revenueRange: 'ONE_M_10M',
  addressLine1: '100 Main St',
  city: 'Austin',
  state: 'TX',
  country: 'US',
  postalCode: '78701',
  status: 'ACTIVE' as const,
  ownerId: 'u1',
  owner: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
  _count: { contacts: 2, activities: 5, opportunities: 1, tasks: 3 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockMutation = {
  mutate: vi.fn(),
  isPending: false,
  isPaused: false,
  isSuccess: false,
  isError: false,
  isIdle: true,
  data: undefined,
  error: null,
  reset: vi.fn(),
  mutateAsync: vi.fn(),
  context: undefined,
  failureCount: 0,
  failureReason: null,
  status: 'idle' as const,
  submittedAt: 0,
  variables: undefined,
};

const adminAuthCtx: AuthContextValue = {
  user: {
    id: 'u1',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'SYSTEM_ADMINISTRATOR',
  },
  accessToken: 'tok',
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
};

const readOnlyCtx: AuthContextValue = {
  ...adminAuthCtx,
  user: { ...adminAuthCtx.user!, role: 'READ_ONLY' },
};

function renderPage(authCtx = adminAuthCtx, customerId = 'c1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter initialEntries={[`/customers/${customerId}`]}>
          <Routes>
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('CustomerDetailPage', () => {
  beforeEach(() => {
    vi.mocked(customersApi.useCustomer).mockReturnValue({
      data: mockCustomer,
      isLoading: false,
    } as unknown as ReturnType<typeof customersApi.useCustomer>);

    vi.mocked(customersApi.useArchiveCustomer).mockReturnValue(
      mockMutation as unknown as ReturnType<typeof customersApi.useArchiveCustomer>,
    );
    vi.mocked(customersApi.useUnarchiveCustomer).mockReturnValue(
      mockMutation as unknown as ReturnType<typeof customersApi.useUnarchiveCustomer>,
    );
  });

  it('renders customer company name and status', () => {
    renderPage();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('shows owner name', () => {
    renderPage();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows counts', () => {
    renderPage();
    expect(screen.getByText(/contacts: 2/i)).toBeInTheDocument();
    expect(screen.getByText(/opportunities: 1/i)).toBeInTheDocument();
  });

  it('shows Archive button for admin when customer is ACTIVE', () => {
    renderPage(adminAuthCtx);
    expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
  });

  it('hides Archive button for READ_ONLY role', () => {
    renderPage(readOnlyCtx);
    expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
  });

  it('calls archive mutation when Archive button is clicked', async () => {
    renderPage(adminAuthCtx);
    await userEvent.click(screen.getByRole('button', { name: /archive/i }));
    expect(mockMutation.mutate).toHaveBeenCalled();
  });

  it('shows Unarchive button when customer is ARCHIVED', () => {
    vi.mocked(customersApi.useCustomer).mockReturnValue({
      data: { ...mockCustomer, status: 'ARCHIVED' },
      isLoading: false,
    } as unknown as ReturnType<typeof customersApi.useCustomer>);

    renderPage(adminAuthCtx);
    expect(screen.getByRole('button', { name: /unarchive/i })).toBeInTheDocument();
  });

  it('returns null when customer data is undefined', () => {
    vi.mocked(customersApi.useCustomer).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof customersApi.useCustomer>);

    const { container } = renderPage();
    expect(container.firstChild).toBeNull();
  });

  it('shows loading spinner when isLoading is true', () => {
    vi.mocked(customersApi.useCustomer).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof customersApi.useCustomer>);

    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
