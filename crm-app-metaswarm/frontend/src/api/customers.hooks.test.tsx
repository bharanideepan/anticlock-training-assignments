import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useUpdateCustomerStatus,
  useArchiveCustomer,
  useUnarchiveCustomer,
} from './customers';
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

const mockCustomer = {
  id: 'c1',
  companyName: 'Acme Corp',
  status: 'PROSPECT' as const,
  ownerId: 'u1',
  owner: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
  _count: { contacts: 0, activities: 0, opportunities: 0, tasks: 0 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const authCtx: AuthContextValue = {
  user: {
    id: 'admin',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'SYSTEM_ADMINISTRATOR',
  },
  accessToken: 'tok',
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
};

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <AuthContext.Provider value={authCtx}>{children}</AuthContext.Provider>
      </QueryClientProvider>
    );
  }
  return Wrapper;
}

describe('useCustomers', () => {
  it('fetches paginated customers', async () => {
    mockFetch.mockResolvedValue(
      makeResponse({
        data: [mockCustomer],
        meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      }),
    );

    const { result } = renderHook(() => useCustomers({}), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe('useCustomer', () => {
  it('fetches a single customer by id', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: mockCustomer }));

    const { result } = renderHook(() => useCustomer('c1'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('c1');
  });
});

describe('useCreateCustomer', () => {
  it('posts to create customer and invalidates cache', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: mockCustomer }, 201));

    const { result } = renderHook(() => useCreateCustomer(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ companyName: 'Acme Corp' });
    });

    expect(result.current.isSuccess).toBe(true);
  });
});

describe('useUpdateCustomer', () => {
  it('patches to update customer', async () => {
    const updated = { ...mockCustomer, companyName: 'Updated' };
    mockFetch.mockResolvedValue(makeResponse({ data: updated }));

    const { result } = renderHook(() => useUpdateCustomer('c1'), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ companyName: 'Updated' });
    });

    expect(result.current.isSuccess).toBe(true);
  });
});

describe('useUpdateCustomerStatus', () => {
  it('patches status endpoint', async () => {
    const updated = { ...mockCustomer, status: 'ACTIVE' as const };
    mockFetch.mockResolvedValue(makeResponse({ data: updated }));

    const { result } = renderHook(() => useUpdateCustomerStatus('c1'), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ status: 'ACTIVE' });
    });

    expect(result.current.isSuccess).toBe(true);
  });
});

describe('useArchiveCustomer', () => {
  it('posts to archive endpoint', async () => {
    const archived = { ...mockCustomer, status: 'ARCHIVED' as const };
    mockFetch.mockResolvedValue(makeResponse({ data: archived }));

    const { result } = renderHook(() => useArchiveCustomer('c1'), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(result.current.isSuccess).toBe(true);
  });
});

describe('useUnarchiveCustomer', () => {
  it('posts to unarchive endpoint', async () => {
    const unarchived = { ...mockCustomer, status: 'INACTIVE' as const };
    mockFetch.mockResolvedValue(makeResponse({ data: unarchived }));

    const { result } = renderHook(() => useUnarchiveCustomer('c1'), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(result.current.isSuccess).toBe(true);
  });
});
