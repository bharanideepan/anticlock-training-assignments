import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { RoleGuard } from './RoleGuard';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';

const mockUser = { id: 'u1', email: 'admin@example.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' };

function makeCtx(user: AuthContextValue['user'] = mockUser): AuthContextValue {
  return { user, accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false };
}

function renderWithGuard(ctx: AuthContextValue, allowedRoles: string[]) {
  return render(
    <AuthContext.Provider value={ctx}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<RoleGuard allowedRoles={allowedRoles} />}>
            <Route path="/admin" element={<div>Admin Area</div>} />
          </Route>
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('RoleGuard', () => {
  it('renders outlet when user has an allowed role', () => {
    renderWithGuard(makeCtx(), ['SYSTEM_ADMINISTRATOR']);
    expect(screen.getByText('Admin Area')).toBeInTheDocument();
  });

  it('redirects to / when user role is not in allowedRoles', () => {
    const salesUser = { ...mockUser, role: 'SALES_REPRESENTATIVE' };
    renderWithGuard(makeCtx(salesUser), ['SYSTEM_ADMINISTRATOR']);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByText('Admin Area')).not.toBeInTheDocument();
  });

  it('redirects to / when user is null', () => {
    renderWithGuard(makeCtx(null), ['SYSTEM_ADMINISTRATOR']);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('allows access when role is in a multi-role allowedRoles list', () => {
    const salesUser = { ...mockUser, role: 'SALES_MANAGER' };
    renderWithGuard(makeCtx(salesUser), ['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER']);
    expect(screen.getByText('Admin Area')).toBeInTheDocument();
  });
});
