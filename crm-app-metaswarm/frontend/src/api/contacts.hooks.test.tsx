import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import { useContacts, useContact, useCreateContact, useUpdateContact, useDeleteContact } from './contacts';
import type { ReactNode } from 'react';

const mockFetch = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', mockFetch));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

function makeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const mockContact = {
  id: 'c1', firstName: 'Sarah', lastName: 'Lee',
  customerId: 'cust-1', customer: { id: 'cust-1', companyName: 'Acme', ownerId: 'u1' },
  _count: { activities: 0, opportunities: 0 },
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

const authCtx: AuthContextValue = {
  user: { id: 'admin', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' },
  accessToken: 'tok', login: vi.fn(), logout: vi.fn(), isLoading: false,
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

describe('useContacts', () => {
  it('fetches paginated contacts', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: [mockContact], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } }));
    const { result } = renderHook(() => useContacts({}), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe('useContact', () => {
  it('fetches single contact by id', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: mockContact }));
    const { result } = renderHook(() => useContact('c1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('c1');
  });
});

describe('useCreateContact', () => {
  it('creates a contact', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: mockContact }, 201));
    const { result } = renderHook(() => useCreateContact(), { wrapper: makeWrapper() });
    await act(async () => { await result.current.mutateAsync({ firstName: 'Sarah', lastName: 'Lee', customerId: 'cust-1' }); });
    expect(result.current.isSuccess).toBe(true);
  });
});

describe('useUpdateContact', () => {
  it('updates a contact', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: { ...mockContact, designation: 'CTO' } }));
    const { result } = renderHook(() => useUpdateContact('c1'), { wrapper: makeWrapper() });
    await act(async () => { await result.current.mutateAsync({ designation: 'CTO' }); });
    expect(result.current.isSuccess).toBe(true);
  });
});

describe('useDeleteContact', () => {
  it('deletes a contact', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    const { result } = renderHook(() => useDeleteContact('c1'), { wrapper: makeWrapper() });
    await act(async () => { await result.current.mutateAsync(); });
    expect(result.current.isSuccess).toBe(true);
  });
});
