import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserDetailPage from './UserDetailPage';
import * as usersApi from '../../api/users';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/users');

const mockUser = {
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
};

const mockMutation = (mutateFn = vi.fn()) => ({
  mutate: mutateFn,
  mutateAsync: vi.fn(),
  isPending: false,
  isPaused: false,
  error: null,
  data: undefined,
  isSuccess: false,
  isError: false,
  isIdle: true,
  reset: vi.fn(),
  status: 'idle' as const,
  variables: undefined,
  context: undefined,
  failureCount: 0,
  failureReason: null,
  submittedAt: 0,
});

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
          <MemoryRouter initialEntries={['/users/u1']}>
            <Routes>
              <Route path="/users/:id" element={children} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }
  return Wrapper;
};

describe('UserDetailPage', () => {
  const deactivateMutate = vi.fn();
  const reactivateMutate = vi.fn();
  const resetPasswordMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.useUser).mockReturnValue({
      data: mockUser,
      isLoading: false,
    } as ReturnType<typeof usersApi.useUser>);
    vi.mocked(usersApi.useDeactivateUser).mockReturnValue(
      mockMutation(deactivateMutate) as unknown as ReturnType<typeof usersApi.useDeactivateUser>,
    );
    vi.mocked(usersApi.useReactivateUser).mockReturnValue(
      mockMutation(reactivateMutate) as unknown as ReturnType<typeof usersApi.useReactivateUser>,
    );
    vi.mocked(usersApi.useResetUserPassword).mockReturnValue(
      mockMutation(resetPasswordMutate) as unknown as ReturnType<typeof usersApi.useResetUserPassword>,
    );
  });

  it('renders user profile', () => {
    render(<UserDetailPage />, { wrapper: makeWrapper() });

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Sales Rep')).toBeInTheDocument();
  });

  it('shows role and team sections', () => {
    render(<UserDetailPage />, { wrapper: makeWrapper() });

    expect(screen.getByText('SALES_REPRESENTATIVE')).toBeInTheDocument();
    expect(screen.getByText('East Sales')).toBeInTheDocument();
  });

  it('shows admin action buttons for SYSTEM_ADMINISTRATOR', () => {
    render(<UserDetailPage />, { wrapper: makeWrapper('SYSTEM_ADMINISTRATOR') });

    expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('hides admin action buttons for SALES_MANAGER', () => {
    render(<UserDetailPage />, { wrapper: makeWrapper('SALES_MANAGER') });

    expect(screen.queryByRole('button', { name: /deactivate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset password/i })).not.toBeInTheDocument();
  });

  it('calls deactivateUser.mutate when Deactivate is clicked', async () => {
    render(<UserDetailPage />, { wrapper: makeWrapper('SYSTEM_ADMINISTRATOR') });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /deactivate/i }));

    expect(deactivateMutate).toHaveBeenCalledWith('u1');
  });

  it('shows Reactivate button when user is INACTIVE', () => {
    vi.mocked(usersApi.useUser).mockReturnValue({
      data: { ...mockUser, status: 'INACTIVE' },
      isLoading: false,
    } as ReturnType<typeof usersApi.useUser>);

    render(<UserDetailPage />, { wrapper: makeWrapper('SYSTEM_ADMINISTRATOR') });

    expect(screen.getByRole('button', { name: /reactivate/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /deactivate/i })).not.toBeInTheDocument();
  });

  it('calls resetPassword.mutate when Reset Password is clicked', async () => {
    render(<UserDetailPage />, { wrapper: makeWrapper('SYSTEM_ADMINISTRATOR') });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(resetPasswordMutate).toHaveBeenCalledWith('u1');
  });

  it('shows Edit User link for SYSTEM_ADMINISTRATOR', () => {
    render(<UserDetailPage />, { wrapper: makeWrapper('SYSTEM_ADMINISTRATOR') });

    expect(screen.getByRole('link', { name: /edit user/i })).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    vi.mocked(usersApi.useUser).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof usersApi.useUser>);

    render(<UserDetailPage />, { wrapper: makeWrapper() });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('calls reactivateUser.mutate when Reactivate is clicked', async () => {
    vi.mocked(usersApi.useUser).mockReturnValue({
      data: { ...mockUser, status: 'INACTIVE' },
      isLoading: false,
    } as ReturnType<typeof usersApi.useUser>);

    render(<UserDetailPage />, { wrapper: makeWrapper('SYSTEM_ADMINISTRATOR') });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /reactivate/i }));

    expect(reactivateMutate).toHaveBeenCalledWith('u1');
  });

  it('renders null when user data is undefined and not loading', () => {
    vi.mocked(usersApi.useUser).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof usersApi.useUser>);

    const { container } = render(<UserDetailPage />, { wrapper: makeWrapper() });

    expect(container.firstChild).toBeNull();
  });
});
