import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { AuthGuard } from './AuthGuard';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';

const mockUser = { id: 'u1', email: 'admin@example.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' };

function makeCtx(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return { user: mockUser, accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false, ...overrides };
}

function renderGuard(ctx: AuthContextValue) {
  return render(
    <AuthContext.Provider value={ctx}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('AuthGuard', () => {
  it('renders outlet when user is authenticated', () => {
    renderGuard(makeCtx());
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('redirects to /login when user is null and not loading', () => {
    renderGuard(makeCtx({ user: null }));
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('shows loading spinner while isLoading is true', () => {
    renderGuard(makeCtx({ user: null, isLoading: true }));
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
