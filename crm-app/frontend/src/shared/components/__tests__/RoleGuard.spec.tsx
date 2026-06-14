import { describe, it, expect, beforeEach } from 'vitest';
import type { RoleName } from '../../types/api.types';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoleGuard } from '../../../router/RoleGuard';
import { useAuth } from '../../hooks/useAuth';

const mockLoginAs = (role: string) => {
  useAuth.setState({
    isAuthenticated: true,
    user: {
      id: 'u1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      status: 'ACTIVE',
      role: { id: 'r1', name: role as RoleName },
      createdAt: new Date().toISOString(),
    },
    accessToken: 'token',
  });
};

describe('RoleGuard', () => {
  beforeEach(() => {
    useAuth.getState().logout();
  });

  it('renders children for permitted role', () => {
    mockLoginAs('SYSTEM_ADMINISTRATOR');
    render(
      <MemoryRouter>
        <RoleGuard allowedRoles={['SYSTEM_ADMINISTRATOR']}>
          <div>Protected Content</div>
        </RoleGuard>
      </MemoryRouter>,
    );
    expect(screen.getByText('Protected Content')).toBeDefined();
  });

  it('redirects to /403 for non-permitted role', () => {
    mockLoginAs('READ_ONLY');
    render(
      <MemoryRouter initialEntries={['/audit']}>
        <RoleGuard allowedRoles={['SYSTEM_ADMINISTRATOR']}>
          <div>Protected Content</div>
        </RoleGuard>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('renders children when user has one of multiple allowed roles', () => {
    mockLoginAs('SALES_MANAGER');
    render(
      <MemoryRouter>
        <RoleGuard allowedRoles={['SYSTEM_ADMINISTRATOR', 'SALES_MANAGER']}>
          <div>Visible Content</div>
        </RoleGuard>
      </MemoryRouter>,
    );
    expect(screen.getByText('Visible Content')).toBeDefined();
  });
});
