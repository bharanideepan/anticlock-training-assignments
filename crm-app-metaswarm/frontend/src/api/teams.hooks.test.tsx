import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import { useTeams, useTeam, useCreateTeam, useUpdateTeam, useDeleteTeam, useAddTeamMembers, useRemoveTeamMember } from './teams';
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

const mockTeam = {
  id: 't1',
  name: 'East Sales',
  description: 'East coast',
  memberCount: 5,
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

describe('useTeams', () => {
  it('fetches paginated teams', async () => {
    mockFetch.mockResolvedValue(makeResponse({
      data: [mockTeam],
      meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
    }));

    const { result } = renderHook(() => useTeams({}), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe('useTeam', () => {
  it('fetches a single team by id', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: { ...mockTeam, members: [] } }));

    const { result } = renderHook(() => useTeam('t1'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('t1');
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useTeam(''), { wrapper: makeWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateTeam', () => {
  it('calls POST /api/v1/teams', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: mockTeam }, 201));

    const { result } = renderHook(() => useCreateTeam(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ name: 'East Sales' });
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/teams', expect.objectContaining({ method: 'POST' }));
  });
});

describe('useUpdateTeam', () => {
  it('calls PATCH /api/v1/teams/:id', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: { ...mockTeam, name: 'Updated' } }));

    const { result } = renderHook(() => useUpdateTeam('t1'), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Updated' });
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/teams/t1', expect.objectContaining({ method: 'PATCH' }));
  });
});

describe('useDeleteTeam', () => {
  it('calls DELETE /api/v1/teams/:id', async () => {
    mockFetch.mockResolvedValue(makeEmptyResponse(204));

    const { result } = renderHook(() => useDeleteTeam(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync('t1');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/teams/t1', expect.objectContaining({ method: 'DELETE' }));
  });
});

describe('useAddTeamMembers', () => {
  it('calls POST /api/v1/teams/:id/members', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: { ...mockTeam, memberCount: 6 } }));

    const { result } = renderHook(() => useAddTeamMembers('t1'), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync(['u2']);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/teams/t1/members', expect.objectContaining({ method: 'POST' }));
  });
});

describe('useRemoveTeamMember', () => {
  it('calls DELETE /api/v1/teams/:id/members/:userId', async () => {
    mockFetch.mockResolvedValue(makeEmptyResponse(204));

    const { result } = renderHook(() => useRemoveTeamMember('t1'), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync('u2');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/teams/t1/members/u2', expect.objectContaining({ method: 'DELETE' }));
  });
});
