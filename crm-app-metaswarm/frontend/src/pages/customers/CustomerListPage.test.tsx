import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CustomerListPage from './CustomerListPage';
import * as customersApi from '../../api/customers';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/customers');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockCustomer = {
  id: 'c1',
  companyName: 'Acme Corp',
  industry: 'Technology',
  status: 'ACTIVE' as const,
  ownerId: 'u1',
  owner: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
  _count: { contacts: 0, activities: 0, opportunities: 0, tasks: 0 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const adminAuthCtx: AuthContextValue = {
  user: {
    id: 'admin',
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

const repAuthCtx: AuthContextValue = {
  ...adminAuthCtx,
  user: { ...adminAuthCtx.user!, role: 'READ_ONLY' },
};

function renderPage(authCtx = adminAuthCtx) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authCtx}>
        <MemoryRouter>
          <CustomerListPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('CustomerListPage', () => {
  beforeEach(() => {
    vi.mocked(customersApi.useCustomers).mockReturnValue({
      data: {
        data: [mockCustomer],
        meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof customersApi.useCustomers>);
    mockNavigate.mockClear();
  });

  it('renders customer table with company name and status chip', () => {
    renderPage();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows Create Customer button for admin', () => {
    renderPage(adminAuthCtx);
    expect(screen.getByRole('button', { name: /create customer/i })).toBeInTheDocument();
  });

  it('hides Create Customer button for READ_ONLY role', () => {
    renderPage(repAuthCtx);
    expect(screen.queryByRole('button', { name: /create customer/i })).not.toBeInTheDocument();
  });

  it('navigates to /customers/new when Create Customer is clicked', async () => {
    renderPage(adminAuthCtx);
    await userEvent.click(screen.getByRole('button', { name: /create customer/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/customers/new');
  });

  it('navigates to customer detail when row is clicked', async () => {
    renderPage();
    await userEvent.click(screen.getByText('Acme Corp'));
    expect(mockNavigate).toHaveBeenCalledWith('/customers/c1');
  });

  it('shows loading spinner when isLoading is true', () => {
    vi.mocked(customersApi.useCustomers).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof customersApi.useCustomers>);

    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows "No customers found" when list is empty', () => {
    vi.mocked(customersApi.useCustomers).mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      isLoading: false,
    } as unknown as ReturnType<typeof customersApi.useCustomers>);

    renderPage();
    expect(screen.getByText(/no customers found/i)).toBeInTheDocument();
  });
});
