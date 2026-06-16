import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import * as authApi from '../api/auth.api';

vi.mock('../api/auth.api');

const mockUser = { id: 'u1', email: 'admin@example.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' };

function TestConsumer() {
  const { user, accessToken, isLoading } = useAuth();
  if (isLoading) return <div>loading</div>;
  if (!user) return <div>not logged in</div>;
  return <div>logged in as {user.email} token={accessToken}</div>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores session on mount when refresh succeeds', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: 'tok', expiresIn: 900 });
    vi.mocked(authApi.getMe).mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(`logged in as ${mockUser.email} token=tok`)).toBeInTheDocument();
    });
  });

  it('shows not-logged-in state when refresh fails (no prior session)', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('no session'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('not logged in')).toBeInTheDocument();
    });
  });

  it('updates state when login() is called', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('no session'));

    function LoginTrigger() {
      const { user, login } = useAuth();
      if (user) return <div>logged in</div>;
      return (
        <button
          onClick={() => login({ accessToken: 'tok2', expiresIn: 900, user: mockUser })}
        >
          do login
        </button>
      );
    }

    render(
      <AuthProvider>
        <LoginTrigger />
      </AuthProvider>,
    );

    await waitFor(() => screen.getByRole('button'));
    await act(async () => {
      screen.getByRole('button').click();
    });
    expect(screen.getByText('logged in')).toBeInTheDocument();
  });

  it('clears state and calls logout API when logout() is called', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: 'tok', expiresIn: 900 });
    vi.mocked(authApi.getMe).mockResolvedValue(mockUser);
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    function LogoutTrigger() {
      const { user, logout } = useAuth();
      if (!user) return <div>logged out</div>;
      return <button onClick={() => { void logout(); }}>do logout</button>;
    }

    render(
      <AuthProvider>
        <LogoutTrigger />
      </AuthProvider>,
    );

    await waitFor(() => screen.getByRole('button'));
    await act(async () => {
      screen.getByRole('button').click();
    });

    await waitFor(() => {
      expect(screen.getByText('logged out')).toBeInTheDocument();
    });
    expect(authApi.logout).toHaveBeenCalledWith('tok');
  });
});
