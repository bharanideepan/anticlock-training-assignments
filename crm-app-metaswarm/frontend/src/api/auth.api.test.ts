import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { login, logout, getMe, refresh, resetPassword, changePassword, requestPasswordReset } from './auth.api';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function makeResponse(body: unknown, status = 200): Response {
  const json = JSON.stringify(body);
  return new Response(json, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeEmptyResponse(status = 204): Response {
  return new Response(null, { status });
}

describe('auth.api', () => {
  describe('login', () => {
    it('POSTs to /api/v1/auth/login and returns data', async () => {
      const responseData = {
        data: { accessToken: 'tok', expiresIn: 900, user: { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' } },
      };
      mockFetch.mockResolvedValue(makeResponse(responseData));

      const result = await login('a@b.com', 'pass');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
      expect(result.accessToken).toBe('tok');
    });

    it('throws when response is not ok', async () => {
      mockFetch.mockResolvedValue(makeResponse({ error: { message: 'Invalid credentials' } }, 401));

      await expect(login('a@b.com', 'bad')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    it('POSTs to /api/v1/auth/refresh', async () => {
      mockFetch.mockResolvedValue(makeResponse({ data: { accessToken: 'new-tok', expiresIn: 900 } }));

      const result = await refresh();

      expect(result.accessToken).toBe('new-tok');
    });
  });

  describe('logout', () => {
    it('POSTs to /api/v1/auth/logout with Bearer token', async () => {
      mockFetch.mockResolvedValue(makeEmptyResponse(204));

      await logout('my-token');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/auth/logout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
        }),
      );
    });
  });

  describe('getMe', () => {
    it('GETs /api/v1/auth/me with Bearer token', async () => {
      const user = { id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'SYSTEM_ADMINISTRATOR' };
      mockFetch.mockResolvedValue(makeResponse({ data: user }));

      const result = await getMe('tok');

      expect(result.email).toBe('a@b.com');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/auth/me',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
      );
    });
  });

  describe('resetPassword', () => {
    it('POSTs to /api/v1/auth/password/reset', async () => {
      mockFetch.mockResolvedValue(makeEmptyResponse(204));

      await resetPassword('reset-tok', 'NewPass@1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/auth/password/reset',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('changePassword', () => {
    it('POSTs to /api/v1/auth/password/change with Bearer token', async () => {
      mockFetch.mockResolvedValue(makeEmptyResponse(204));

      await changePassword('tok', 'Old@1', 'New@1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/auth/password/change',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }),
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('POSTs to /api/v1/auth/password/reset-request', async () => {
      // Backend returns { status: 202 } (not the data envelope) — apiFetch<void> returns undefined
      mockFetch.mockResolvedValue(makeResponse({ status: 202 }, 202));

      await requestPasswordReset('a@b.com');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/auth/password/reset-request',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
