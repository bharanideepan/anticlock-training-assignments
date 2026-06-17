import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoginPage from './LoginPage';
import * as authApi from '../../api/auth.api';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/auth.api');

const mockLogin = vi.fn();

const makeWrapper = (contextValue: Partial<AuthContextValue> = {}) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ctx: AuthContextValue = {
    user: null,
    accessToken: null,
    login: mockLogin,
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

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields with a login button', () => {
    render(<LoginPage />, { wrapper: makeWrapper() });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  it('renders SSO initiate button', () => {
    render(<LoginPage />, { wrapper: makeWrapper() });

    expect(screen.getByRole('button', { name: /sign in with sso/i })).toBeInTheDocument();
  });

  it('shows validation error when email is empty on submit', async () => {
    render(<LoginPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it('shows validation error when password is empty on submit', async () => {
    render(<LoginPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('calls authApi.login and then context.login on valid submission', async () => {
    const mockApiLogin = vi.mocked(authApi.login);
    mockApiLogin.mockResolvedValue({
      accessToken: 'tok',
      expiresIn: 900,
      user: { id: 'u1', email: 'admin@example.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
    });

    render(<LoginPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Secret@123');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockApiLogin).toHaveBeenCalledWith('admin@example.com', 'Secret@123');
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('shows error message when login API returns 401', async () => {
    const mockApiLogin = vi.mocked(authApi.login);
    mockApiLogin.mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginPage />, { wrapper: makeWrapper() });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('disables submit button while loading', async () => {
    render(<LoginPage />, { wrapper: makeWrapper({ isLoading: true }) });

    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeDisabled();
  });
});
