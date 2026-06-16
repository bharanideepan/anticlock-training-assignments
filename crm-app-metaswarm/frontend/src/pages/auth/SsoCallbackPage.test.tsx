import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SsoCallbackPage from './SsoCallbackPage';
import * as authApi from '../../api/auth.api';
import { AuthContext, type AuthContextValue } from '../../context/AuthContext';

vi.mock('../../api/auth.api');

const mockUser = { id: 'u1', email: 'sso@example.com', firstName: 'S', lastName: 'U', role: 'SALES_REPRESENTATIVE' };
const mockLogin = vi.fn();

function makeCtx(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return { user: null, accessToken: null, login: mockLogin, logout: vi.fn(), isLoading: false, ...overrides };
}

function renderPage(ctx: AuthContextValue, search = '') {
  return render(
    <AuthContext.Provider value={ctx}>
      <MemoryRouter initialEntries={[`/auth/sso/callback${search}`]}>
        <Routes>
          <Route path="/auth/sso/callback" element={<SsoCallbackPage />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('SsoCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    vi.mocked(authApi.refresh).mockReturnValue(new Promise(() => undefined));
    renderPage(makeCtx());
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('exchanges token from URL and navigates to / on success', async () => {
    vi.mocked(authApi.getMe).mockResolvedValue(mockUser);
    renderPage(makeCtx(), '?token=sso-tok');

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ accessToken: 'sso-tok', expiresIn: 900, user: mockUser });
    });
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
    });
  });

  it('shows error when SSO callback fails without token', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('no session'));
    renderPage(makeCtx());

    await waitFor(() => {
      expect(screen.getByText(/sso authentication failed/i)).toBeInTheDocument();
    });
  });

  it('uses refresh + getMe when no token in URL', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: 'sso-refresh', expiresIn: 900 });
    vi.mocked(authApi.getMe).mockResolvedValue(mockUser);
    renderPage(makeCtx());

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ accessToken: 'sso-refresh', expiresIn: 900, user: mockUser });
    });
  });
});
