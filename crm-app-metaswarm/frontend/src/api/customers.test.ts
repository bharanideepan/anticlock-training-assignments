import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  updateCustomerStatus,
  archiveCustomer,
  unarchiveCustomer,
} from './customers';

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
  status: 'PROSPECT',
  ownerId: 'u1',
  owner: { id: 'u1', firstName: 'Jane', lastName: 'Doe' },
  _count: { contacts: 0, activities: 0, opportunities: 0, tasks: 0 },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('listCustomers', () => {
  it('GETs /api/v1/customers with query params and returns paginated response', async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ data: [mockCustomer], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } }),
    );

    const result = await listCustomers({ search: 'acme', page: 1 }, 'tok');

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('search=acme');
  });
});

describe('getCustomer', () => {
  it('GETs /api/v1/customers/:id and returns customer', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: mockCustomer }));

    const result = await getCustomer('c1', 'tok');

    expect(result.id).toBe('c1');
    expect(mockFetch.mock.calls[0][0]).toContain('/c1');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue(
      makeResponse({ error: { code: 'NOT_FOUND', message: 'Customer not found' } }, 404),
    );

    await expect(getCustomer('bad', 'tok')).rejects.toThrow('Customer not found');
  });
});

describe('createCustomer', () => {
  it('POSTs to /api/v1/customers and returns created customer', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: mockCustomer }, 201));

    const result = await createCustomer({ companyName: 'Acme Corp' }, 'tok');

    expect(result.companyName).toBe('Acme Corp');
    expect(mockFetch.mock.calls[0][1]?.method).toBe('POST');
  });
});

describe('updateCustomer', () => {
  it('PATCHes /api/v1/customers/:id', async () => {
    const updated = { ...mockCustomer, companyName: 'Acme Updated' };
    mockFetch.mockResolvedValue(makeResponse({ data: updated }));

    const result = await updateCustomer('c1', { companyName: 'Acme Updated' }, 'tok');

    expect(result.companyName).toBe('Acme Updated');
    expect(mockFetch.mock.calls[0][1]?.method).toBe('PATCH');
  });
});

describe('updateCustomerStatus', () => {
  it('PATCHes /api/v1/customers/:id/status', async () => {
    const updated = { ...mockCustomer, status: 'ACTIVE' };
    mockFetch.mockResolvedValue(makeResponse({ data: updated }));

    const result = await updateCustomerStatus('c1', { status: 'ACTIVE' }, 'tok');

    expect(result.status).toBe('ACTIVE');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/c1/status');
  });
});

describe('archiveCustomer', () => {
  it('POSTs to /api/v1/customers/:id/archive', async () => {
    const archived = { ...mockCustomer, status: 'ARCHIVED' };
    mockFetch.mockResolvedValue(makeResponse({ data: archived }));

    const result = await archiveCustomer('c1', 'tok');

    expect(result.status).toBe('ARCHIVED');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/c1/archive');
  });
});

describe('unarchiveCustomer', () => {
  it('POSTs to /api/v1/customers/:id/unarchive', async () => {
    const unarchived = { ...mockCustomer, status: 'INACTIVE' };
    mockFetch.mockResolvedValue(makeResponse({ data: unarchived }));

    const result = await unarchiveCustomer('c1', 'tok');

    expect(result.status).toBe('INACTIVE');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/c1/unarchive');
  });
});
