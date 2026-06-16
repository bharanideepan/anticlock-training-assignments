import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import { useUsers, useUser, useCreateUser, useUpdateUser, useDeactivateUser, useReactivateUser, useResetUserPassword, useUpdateUserRole, useUpdateUserTeams } from './users';
import type { ReactNode } from 'react';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function makeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeEmptyResponse(status = 204): Response {
  return new Response(null, { status });
}

const mockUser = {
  id: 'u1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  status: 'ACTIVE' as const,
  role: { id: 'r1', name: 'SALES_REPRESENTATIVE' },
  teams: [{ id: 't1', name: 'East Sales' }],
  createdAt: '2026-01-15T10:00:00Z',
};

const authCtx: AuthContextValue = {
  user: { id: 'admin', email: 'admin@example.com', firstName: 'Admin', lastName: 'User', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok',
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <AuthContext.Provider value={authCtx}>{children}</AuthContext.Provider>
      </QueryClientProvider>
    );
  }
  return Wrapper;
}

describe('useUsers', () => {
  it('fetches paginated users', async () => {
    mockFetch.mockResolvedValue(makeResponse({
      data: [mockUser],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    }));

    const { result } = renderHook(() => useUsers({}), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe('useUser', () => {
  it('fetches a single user by id', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: mockUser }));

    const { result } = renderHook(() => useUser('u1'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('u1');
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useUser(''), { wrapper: makeWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateUser', () => {
  it('calls POST /api/v1/users and invalidates users query', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: mockUser }, 201));

    const { result } = renderHook(() => useCreateUser(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        roleId: 'r1',
        teamIds: [],
      });
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/users', expect.objectContaining({ method: 'POST' }));
  });
});

describe('useUpdateUser', () => {
  it('calls PATCH /api/v1/users/:id', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: { ...mockUser, firstName: 'Janet' } }));

    const { result } = renderHook(() => useUpdateUser('u1'), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ firstName: 'Janet' });
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/users/u1', expect.objectContaining({ method: 'PATCH' }));
  });
});

describe('useDeactivateUser', () => {
  it('calls POST /api/v1/users/:id/deactivate', async () => {
    mockFetch.mockResolvedValue(makeEmptyResponse(204));

    const { result } = renderHook(() => useDeactivateUser(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync('u1');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/users/u1/deactivate', expect.objectContaining({ method: 'POST' }));
  });
});

describe('useReactivateUser', () => {
  it('calls POST /api/v1/users/:id/reactivate', async () => {
    mockFetch.mockResolvedValue(makeEmptyResponse(204));

    const { result } = renderHook(() => useReactivateUser(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync('u1');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/users/u1/reactivate', expect.objectContaining({ method: 'POST' }));
  });
});

describe('useResetUserPassword', () => {
  it('calls POST /api/v1/users/:id/reset-password', async () => {
    mockFetch.mockResolvedValue(makeResponse({ status: 202 }, 202));

    const { result } = renderHook(() => useResetUserPassword(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync('u1');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/users/u1/reset-password', expect.objectContaining({ method: 'POST' }));
  });
});

describe('useUpdateUserRole', () => {
  it('calls PATCH /api/v1/users/:id/role', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: { ...mockUser, role: { id: 'r2', name: 'SALES_MANAGER' } } }));

    const { result } = renderHook(() => useUpdateUserRole('u1'), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync('r2');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/users/u1/role', expect.objectContaining({ method: 'PATCH' }));
  });
});

describe('useUpdateUserTeams', () => {
  it('calls PATCH /api/v1/users/:id/teams', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: mockUser }));

    const { result } = renderHook(() => useUpdateUserTeams('u1'), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync(['t1', 't2']);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/users/u1/teams', expect.objectContaining({ method: 'PATCH' }));
  });
});
