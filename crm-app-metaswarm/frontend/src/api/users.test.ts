import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  resetUserPassword,
  updateUserRole,
  updateUserTeams,
} from './users';

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
  phone: '+1-555-0200',
  jobTitle: 'Sales Rep',
  status: 'ACTIVE',
  role: { id: 'r1', name: 'SALES_REPRESENTATIVE' },
  teams: [{ id: 't1', name: 'East Sales' }],
  createdAt: '2026-01-15T10:00:00Z',
};

describe('users API', () => {
  describe('listUsers', () => {
    it('GETs /api/v1/users and returns paginated data', async () => {
      mockFetch.mockResolvedValue(
        makeResponse({
          data: [mockUser],
          meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
        }),
      );

      const result = await listUsers({}, 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/users'),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('appends query params when provided', async () => {
      mockFetch.mockResolvedValue(makeResponse({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }));

      await listUsers({ search: 'jane', status: 'ACTIVE', page: 2 }, 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=jane'),
        expect.anything(),
      );
    });

    it('throws when response is not ok', async () => {
      mockFetch.mockResolvedValue(makeResponse({ error: { message: 'Forbidden' } }, 403));

      await expect(listUsers({}, 'tok')).rejects.toThrow('Forbidden');
    });
  });

  describe('getUser', () => {
    it('GETs /api/v1/users/:id', async () => {
      mockFetch.mockResolvedValue(makeResponse({ data: mockUser }));

      const result = await getUser('u1', 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/u1',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
      );
      expect(result.id).toBe('u1');
    });
  });

  describe('createUser', () => {
    it('POSTs to /api/v1/users and returns created user', async () => {
      mockFetch.mockResolvedValue(makeResponse({ data: mockUser }, 201));

      const result = await createUser(
        { email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe', roleId: 'r1', teamIds: [] },
        'tok',
      );

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.email).toBe('jane@example.com');
    });
  });

  describe('updateUser', () => {
    it('PATCHes /api/v1/users/:id', async () => {
      mockFetch.mockResolvedValue(makeResponse({ data: { ...mockUser, firstName: 'Janet' } }));

      const result = await updateUser('u1', { firstName: 'Janet' }, 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/u1',
        expect.objectContaining({ method: 'PATCH' }),
      );
      expect(result.firstName).toBe('Janet');
    });
  });

  describe('deactivateUser', () => {
    it('POSTs to /api/v1/users/:id/deactivate', async () => {
      mockFetch.mockResolvedValue(makeEmptyResponse(204));

      await deactivateUser('u1', 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/u1/deactivate',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('reactivateUser', () => {
    it('POSTs to /api/v1/users/:id/reactivate', async () => {
      mockFetch.mockResolvedValue(makeEmptyResponse(204));

      await reactivateUser('u1', 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/u1/reactivate',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('resetUserPassword', () => {
    it('POSTs to /api/v1/users/:id/reset-password', async () => {
      mockFetch.mockResolvedValue(makeResponse({ status: 202 }, 202));

      await resetUserPassword('u1', 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/u1/reset-password',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('updateUserRole', () => {
    it('PATCHes /api/v1/users/:id/role', async () => {
      mockFetch.mockResolvedValue(makeResponse({ data: { ...mockUser, role: { id: 'r2', name: 'SALES_MANAGER' } } }));

      const result = await updateUserRole('u1', 'r2', 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/u1/role',
        expect.objectContaining({ method: 'PATCH' }),
      );
      expect(result.role.name).toBe('SALES_MANAGER');
    });
  });

  describe('updateUserTeams', () => {
    it('PATCHes /api/v1/users/:id/teams', async () => {
      mockFetch.mockResolvedValue(makeResponse({ data: { ...mockUser, teams: [{ id: 't2', name: 'West Sales' }] } }));

      const result = await updateUserTeams('u1', ['t2'], 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/u1/teams',
        expect.objectContaining({ method: 'PATCH' }),
      );
      expect(result.teams[0].name).toBe('West Sales');
    });
  });
});
