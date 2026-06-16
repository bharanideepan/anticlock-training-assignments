import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMembers,
  removeTeamMember,
} from './teams';

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
  description: 'East coast team',
  manager: { id: 'u1', firstName: 'Alice', lastName: 'Smith' },
  memberCount: 5,
};

describe('teams API', () => {
  describe('listTeams', () => {
    it('GETs /api/v1/teams and returns paginated data', async () => {
      mockFetch.mockResolvedValue(
        makeResponse({
          data: [mockTeam],
          meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
        }),
      );

      const result = await listTeams({}, 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/teams'),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('appends search param when provided', async () => {
      mockFetch.mockResolvedValue(makeResponse({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }));

      await listTeams({ search: 'east' }, 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=east'),
        expect.anything(),
      );
    });
  });

  describe('getTeam', () => {
    it('GETs /api/v1/teams/:id', async () => {
      const teamDetail = { ...mockTeam, members: [{ id: 'u2', firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' }] };
      mockFetch.mockResolvedValue(makeResponse({ data: teamDetail }));

      const result = await getTeam('t1', 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/teams/t1',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
      );
      expect(result.id).toBe('t1');
    });
  });

  describe('createTeam', () => {
    it('POSTs to /api/v1/teams and returns created team', async () => {
      mockFetch.mockResolvedValue(makeResponse({ data: mockTeam }, 201));

      const result = await createTeam({ name: 'East Sales', description: 'East coast team' }, 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/teams',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.name).toBe('East Sales');
    });
  });

  describe('updateTeam', () => {
    it('PATCHes /api/v1/teams/:id', async () => {
      mockFetch.mockResolvedValue(makeResponse({ data: { ...mockTeam, name: 'East Sales Updated' } }));

      const result = await updateTeam('t1', { name: 'East Sales Updated' }, 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/teams/t1',
        expect.objectContaining({ method: 'PATCH' }),
      );
      expect(result.name).toBe('East Sales Updated');
    });
  });

  describe('deleteTeam', () => {
    it('DELETEs /api/v1/teams/:id', async () => {
      mockFetch.mockResolvedValue(makeEmptyResponse(204));

      await deleteTeam('t1', 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/teams/t1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('addTeamMembers', () => {
    it('POSTs to /api/v1/teams/:id/members', async () => {
      const updatedTeam = { ...mockTeam, memberCount: 6 };
      mockFetch.mockResolvedValue(makeResponse({ data: updatedTeam }, 200));

      const result = await addTeamMembers('t1', ['u2'], 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/teams/t1/members',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.memberCount).toBe(6);
    });
  });

  describe('removeTeamMember', () => {
    it('DELETEs /api/v1/teams/:id/members/:userId', async () => {
      mockFetch.mockResolvedValue(makeEmptyResponse(204));

      await removeTeamMember('t1', 'u2', 'tok');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/teams/t1/members/u2',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
