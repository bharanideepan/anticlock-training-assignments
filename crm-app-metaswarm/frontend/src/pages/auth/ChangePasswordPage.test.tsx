import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ChangePasswordPage from './ChangePasswordPage';
import * as authApi from '../../api/auth.api';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/auth.api');

const mockUser = { id: 'u1', email: 'admin@example.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' };

const makeWrapper = (contextValue: Partial<AuthContextValue> = {}) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ctx: AuthContextValue = {
    user: mockUser,
    accessToken: 'tok',
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
    ...contextValue,
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

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders current password, new password, and confirm password fields', () => {
    render(<ChangePasswordPage />, { wrapper: makeWrapper() });

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  it('shows validation error when current password is empty', async () => {
    render(<ChangePasswordPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/current password is required/i)).toBeInTheDocument();
  });

  it('shows validation error when new password is too short', async () => {
    render(<ChangePasswordPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/current password/i), 'Old@pass1');
    await user.type(screen.getByLabelText(/new password/i), 'short');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('shows validation error when passwords do not match', async () => {
    render(<ChangePasswordPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/current password/i), 'Old@pass1');
    await user.type(screen.getByLabelText(/new password/i), 'NewPass@123');
    await user.type(screen.getByLabelText(/confirm password/i), 'Different@456');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('calls authApi.changePassword with current and new passwords', async () => {
    const mockChange = vi.mocked(authApi.changePassword);
    mockChange.mockResolvedValue(undefined);

    render(<ChangePasswordPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/current password/i), 'Old@pass1');
    await user.type(screen.getByLabelText(/new password/i), 'NewPass@123');
    await user.type(screen.getByLabelText(/confirm password/i), 'NewPass@123');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(mockChange).toHaveBeenCalledWith('tok', 'Old@pass1', 'NewPass@123');
    });
  });

  it('shows success message after successful password change', async () => {
    const mockChange = vi.mocked(authApi.changePassword);
    mockChange.mockResolvedValue(undefined);

    render(<ChangePasswordPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/current password/i), 'Old@pass1');
    await user.type(screen.getByLabelText(/new password/i), 'NewPass@123');
    await user.type(screen.getByLabelText(/confirm password/i), 'NewPass@123');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/password changed successfully/i)).toBeInTheDocument();
  });

  it('shows error message when current password is wrong', async () => {
    const mockChange = vi.mocked(authApi.changePassword);
    mockChange.mockRejectedValue(new Error('Current password is incorrect'));

    render(<ChangePasswordPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/current password/i), 'WrongOld@1');
    await user.type(screen.getByLabelText(/new password/i), 'NewPass@123');
    await user.type(screen.getByLabelText(/confirm password/i), 'NewPass@123');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/current password is incorrect/i)).toBeInTheDocument();
  });
});
