import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { listContacts, getContact, createContact, updateContact, deleteContact } from './contacts';

const mockFetch = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', mockFetch));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

function makeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const mockContact = {
  id: 'c1', firstName: 'Sarah', lastName: 'Lee', email: 'sarah@acme.com',
  customerId: 'cust-1', customer: { id: 'cust-1', companyName: 'Acme', ownerId: 'u1' },
  _count: { activities: 0, opportunities: 0 }, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

describe('listContacts', () => {
  it('GETs /api/v1/contacts and returns paginated data', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: [mockContact], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } }));
    const result = await listContacts({ customerId: 'cust-1' }, 'tok');
    expect(result.data).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toContain('customerId=cust-1');
  });
});

describe('getContact', () => {
  it('GETs /api/v1/contacts/:id', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: mockContact }));
    const result = await getContact('c1', 'tok');
    expect(result.id).toBe('c1');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: { code: 'NOT_FOUND', message: 'Contact not found' } }, 404));
    await expect(getContact('bad', 'tok')).rejects.toThrow('Contact not found');
  });
});

describe('createContact', () => {
  it('POSTs to /api/v1/contacts', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: mockContact }, 201));
    const result = await createContact({ firstName: 'Sarah', lastName: 'Lee', customerId: 'cust-1' }, 'tok');
    expect(result.firstName).toBe('Sarah');
    expect(mockFetch.mock.calls[0][1]?.method).toBe('POST');
  });
});

describe('updateContact', () => {
  it('PATCHes /api/v1/contacts/:id', async () => {
    const updated = { ...mockContact, designation: 'CTO' };
    mockFetch.mockResolvedValue(makeResponse({ data: updated }));
    const result = await updateContact('c1', { designation: 'CTO' }, 'tok');
    expect(result.designation).toBe('CTO');
    expect(mockFetch.mock.calls[0][1]?.method).toBe('PATCH');
  });
});

describe('deleteContact', () => {
  it('DELETEs /api/v1/contacts/:id and returns void', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(deleteContact('c1', 'tok')).resolves.toBeUndefined();
    expect(mockFetch.mock.calls[0][1]?.method).toBe('DELETE');
  });
});
