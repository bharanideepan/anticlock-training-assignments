import { describe, it, expect, beforeEach } from 'vitest';
import { useAuth } from '../../../shared/hooks/useAuth';

describe('useAuth store', () => {
  beforeEach(() => {
    useAuth.getState().logout();
  });

  it('starts unauthenticated', () => {
    const state = useAuth.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('authenticates on login', () => {
    const mockUser = {
      id: 'user-1',
      email: 'admin@crm.local',
      firstName: 'Admin',
      lastName: 'User',
      status: 'ACTIVE' as const,
      role: { id: 'r1', name: 'SYSTEM_ADMINISTRATOR' as const },
      createdAt: new Date().toISOString(),
    };

    useAuth.getState().login('access-token', mockUser);

    const state = useAuth.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access-token');
  });

  it('clears state on logout', () => {
    const mockUser = {
      id: 'user-1',
      email: 'admin@crm.local',
      firstName: 'Admin',
      lastName: 'User',
      status: 'ACTIVE' as const,
      role: { id: 'r1', name: 'SYSTEM_ADMINISTRATOR' as const },
      createdAt: new Date().toISOString(),
    };
    useAuth.getState().login('token', mockUser);
    useAuth.getState().logout();

    const state = useAuth.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});
