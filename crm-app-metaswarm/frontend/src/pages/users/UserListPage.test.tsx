import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserListPage from './UserListPage';
import * as usersApi from '../../api/users';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/users');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUsers = [
  {
    id: 'u1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+1-555-0200',
    jobTitle: 'Sales Rep',
    status: 'ACTIVE' as const,
    role: { id: 'r1', name: 'SALES_REPRESENTATIVE' },
    teams: [{ id: 't1', name: 'East Sales' }],
    createdAt: '2026-01-15T10:00:00Z',
  },
];

const mockPaginatedResponse = {
  data: mockUsers,
  meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
};

const makeWrapper = (role = 'SYSTEM_ADMINISTRATOR') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ctx: AuthContextValue = {
    user: { id: 'admin', email: 'admin@example.com', firstName: 'Admin', lastName: 'User', role },
    accessToken: 'tok',
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  };
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <AuthContext.Provider value={ctx}>
          <MemoryRouter>{children}</MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }
  return Wrapper;
};

describe('UserListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.useUsers).mockReturnValue({
      data: mockPaginatedResponse,
      isLoading: false,
    } as ReturnType<typeof usersApi.useUsers>);
  });

  it('renders page title', () => {
    render(<UserListPage />, { wrapper: makeWrapper() });

    expect(screen.getByText(/users/i)).toBeInTheDocument();
  });

  it('renders user table with data', () => {
    render(<UserListPage />, { wrapper: makeWrapper() });

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('East Sales')).toBeInTheDocument();
  });

  it('shows Create User button for SYSTEM_ADMINISTRATOR', () => {
    render(<UserListPage />, { wrapper: makeWrapper('SYSTEM_ADMINISTRATOR') });

    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
  });

  it('hides Create User button for SALES_MANAGER', () => {
    render(<UserListPage />, { wrapper: makeWrapper('SALES_MANAGER') });

    expect(screen.queryByRole('button', { name: /create user/i })).not.toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<UserListPage />, { wrapper: makeWrapper() });

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('shows status chip based on user status', () => {
    render(<UserListPage />, { wrapper: makeWrapper() });

    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    vi.mocked(usersApi.useUsers).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof usersApi.useUsers>);

    render(<UserListPage />, { wrapper: makeWrapper() });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('calls useUsers with search param when user types in search', async () => {
    render(<UserListPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/search/i), 'jane');

    await waitFor(() => {
      expect(usersApi.useUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'jane' }),
      );
    });
  });

  it('navigates to user detail page on row click', async () => {
    render(<UserListPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    const row = screen.getByText('Jane Doe').closest('tr');
    if (row) await user.click(row);

    expect(mockNavigate).toHaveBeenCalledWith('/users/u1');
  });
});
