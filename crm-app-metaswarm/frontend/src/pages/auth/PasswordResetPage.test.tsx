import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PasswordResetPage from './PasswordResetPage';
import * as authApi from '../../api/auth.api';

vi.mock('../../api/auth.api');

const makeWrapper = (search = '?token=abc123') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[`/auth/password-reset${search}`]}>
          <Routes>
            <Route path="/auth/password-reset" element={children} />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }
  return Wrapper;
};

describe('PasswordResetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders new password and confirm password fields', () => {
    render(<PasswordResetPage />, { wrapper: makeWrapper() });

    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('shows validation error when new password is too short', async () => {
    render(<PasswordResetPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/new password/i), 'short');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('shows validation error when passwords do not match', async () => {
    render(<PasswordResetPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/new password/i), 'Password@123');
    await user.type(screen.getByLabelText(/confirm password/i), 'Different@123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('calls authApi.resetPassword with token from URL and new password', async () => {
    const mockReset = vi.mocked(authApi.resetPassword);
    mockReset.mockResolvedValue(undefined);

    render(<PasswordResetPage />, { wrapper: makeWrapper('?token=mytoken123') });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/new password/i), 'NewPass@123');
    await user.type(screen.getByLabelText(/confirm password/i), 'NewPass@123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith('mytoken123', 'NewPass@123');
    });
  });

  it('shows success message after successful reset', async () => {
    const mockReset = vi.mocked(authApi.resetPassword);
    mockReset.mockResolvedValue(undefined);

    render(<PasswordResetPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/new password/i), 'NewPass@123');
    await user.type(screen.getByLabelText(/confirm password/i), 'NewPass@123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/password has been reset/i)).toBeInTheDocument();
  });

  it('shows error message when token is invalid', async () => {
    const mockReset = vi.mocked(authApi.resetPassword);
    mockReset.mockRejectedValue(new Error('Invalid or expired token'));

    render(<PasswordResetPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/new password/i), 'NewPass@123');
    await user.type(screen.getByLabelText(/confirm password/i), 'NewPass@123');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/invalid or expired token/i)).toBeInTheDocument();
  });

  it('shows error when no token in URL', () => {
    render(<PasswordResetPage />, { wrapper: makeWrapper('') });

    expect(screen.getByText(/invalid or missing reset token/i)).toBeInTheDocument();
  });
});
