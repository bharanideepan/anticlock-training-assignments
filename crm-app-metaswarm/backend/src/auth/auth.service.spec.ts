import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditAction, RoleName, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { SsoConfigDto } from './dto/sso-config.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  passwordResetToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  ssoConfig: { findFirst: jest.fn(), upsert: jest.fn() },
  auditLog: { create: jest.fn() },
};

const mockJwtService = { sign: jest.fn().mockReturnValue('mock-jwt-token') };
const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_EXPIRY_DAYS: '7',
      SSO_ENCRYPTION_KEY: '0'.repeat(64),
      FRONTEND_URL: 'http://localhost:3000',
    };
    return config[key];
  }),
};
const mockMailer = { sendMail: jest.fn().mockResolvedValue(undefined) };

const mockAdminRole = { id: 'role-admin', name: RoleName.SYSTEM_ADMINISTRATOR };
const mockAdminUser = {
  id: 'user-1',
  email: 'admin@example.com',
  passwordHash: null as string | null,
  firstName: 'Admin',
  lastName: 'User',
  phone: null,
  jobTitle: null,
  status: UserStatus.ACTIVE,
  roleId: 'role-admin',
  role: mockAdminRole,
  teamMemberships: [],
  deletedAt: null,
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAdminUser.passwordHash = await bcrypt.hash('SecurePass123!', 10);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'MAILER_SERVICE', useValue: mockMailer },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── validateUser ───────────────────────────────────────────────────────────
  describe('validateUser', () => {
    it('returns null and logs FAILED_LOGIN when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.validateUser('x@x.com', 'pass');
      expect(result).toBeNull();
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.LOGIN_FAILED }) }),
      );
    });

    it('returns null and logs FAILED_LOGIN when password wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      const result = await service.validateUser('admin@example.com', 'WrongPass!');
      expect(result).toBeNull();
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.LOGIN_FAILED }) }),
      );
    });

    it('returns null when user has no passwordHash (SSO-only user)', async () => {
      const ssoUser = { ...mockAdminUser, passwordHash: null };
      mockPrisma.user.findUnique.mockResolvedValue(ssoUser);
      mockPrisma.auditLog.create.mockResolvedValue({});
      const result = await service.validateUser('sso@example.com', 'anypass');
      expect(result).toBeNull();
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.LOGIN_FAILED }) }),
      );
    });

    it('returns null for non-SYSTEM_ADMINISTRATOR users', async () => {
      const salesUser = {
        ...mockAdminUser,
        role: { id: 'role-rep', name: RoleName.SALES_REPRESENTATIVE },
      };
      mockPrisma.user.findUnique.mockResolvedValue(salesUser);
      const result = await service.validateUser('sales@example.com', 'SecurePass123!');
      expect(result).toBeNull();
    });

    it('returns null and logs FAILED_LOGIN when user is inactive', async () => {
      const inactiveUser = { ...mockAdminUser, status: UserStatus.INACTIVE };
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);
      const result = await service.validateUser('admin@example.com', 'SecurePass123!');
      expect(result).toBeNull();
    });

    it('returns user when credentials are valid and role is SYSTEM_ADMINISTRATOR', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      const result = await service.validateUser('admin@example.com', 'SecurePass123!');
      expect(result).toMatchObject({ id: 'user-1', email: 'admin@example.com' });
    });
  });

  // ─── login ──────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('returns accessToken and sets crm_refresh cookie', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      const mockResponse = { cookie: jest.fn() };

      const result = await service.login(mockAdminUser, mockResponse as never);

      expect(result).toMatchObject({ accessToken: 'mock-jwt-token', expiresIn: 900 });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'crm_refresh',
        expect.any(String),
        expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'strict' }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.LOGIN }) }),
      );
    });

    it('stores bcrypt hash of refresh token (not plaintext)', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      const mockResponse = { cookie: jest.fn() };

      await service.login(mockAdminUser, mockResponse as never);

      const createCall = mockPrisma.refreshToken.create.mock.calls[0][0];
      expect(createCall.data.tokenHash).not.toBe(createCall.data.token);
      expect(createCall.data.tokenHash).toMatch(/^\$2[aby]/);
    });
  });

  // ─── logout ─────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('revokes refresh token and clears cookie', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
      });
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      const mockResponse = { clearCookie: jest.fn() };

      await service.logout('user-1', 'raw-token', mockResponse as never);

      expect(mockPrisma.refreshToken.delete).toHaveBeenCalled();
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('crm_refresh');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.LOGOUT }) }),
      );
    });
  });

  // ─── refreshAccessToken ──────────────────────────────────────────────────────
  describe('refreshAccessToken', () => {
    const validToken = {
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: '',
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
    };

    it('throws REFRESH_TOKEN_INVALID when token not found', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);
      await expect(
        service.refreshAccessToken('bad-token', { cookie: jest.fn() } as never),
      ).rejects.toMatchObject({ message: 'REFRESH_TOKEN_INVALID' });
    });

    it('throws REFRESH_TOKEN_EXPIRED when token is past expiresAt', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        ...validToken,
        expiresAt: new Date(Date.now() - 1000),
      });
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      await expect(
        service.refreshAccessToken('expired-token', { cookie: jest.fn() } as never),
      ).rejects.toMatchObject({ message: 'REFRESH_TOKEN_EXPIRED' });
    });

    it('throws REFRESH_TOKEN_INVALID when token hash does not match', async () => {
      // Token is found and not expired, but bcrypt.compare returns false (wrong raw token)
      const tokenHash = await bcrypt.hash('correct-raw-token', 10);
      mockPrisma.refreshToken.findFirst.mockResolvedValue({ ...validToken, tokenHash });
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      await expect(
        service.refreshAccessToken('wrong-raw-token', { cookie: jest.fn() } as never),
      ).rejects.toMatchObject({ message: 'REFRESH_TOKEN_INVALID' });
    });

    it('throws REFRESH_TOKEN_INVALID when user no longer exists after token deletion', async () => {
      const plainToken = 'raw-refresh-token';
      const tokenHash = await bcrypt.hash(plainToken, 10);
      mockPrisma.refreshToken.findFirst.mockResolvedValue({ ...validToken, tokenHash });
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(null); // user deleted
      await expect(
        service.refreshAccessToken(plainToken, { cookie: jest.fn() } as never),
      ).rejects.toMatchObject({ message: 'REFRESH_TOKEN_INVALID' });
    });

    it('rotates token and returns new accessToken', async () => {
      const plainToken = 'raw-refresh-token';
      const tokenHash = await bcrypt.hash(plainToken, 10);
      mockPrisma.refreshToken.findFirst.mockResolvedValue({ ...validToken, tokenHash });
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
      const mockResponse = { cookie: jest.fn() };

      const result = await service.refreshAccessToken(plainToken, mockResponse as never);

      expect(result).toMatchObject({ accessToken: 'mock-jwt-token', expiresIn: 900 });
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalled();
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
      expect(mockResponse.cookie).toHaveBeenCalledWith('crm_refresh', expect.any(String), expect.any(Object));
    });
  });

  // ─── requestPasswordReset ────────────────────────────────────────────────────
  describe('requestPasswordReset', () => {
    it('returns void regardless of whether email exists (prevents enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.requestPasswordReset('nobody@x.com')).resolves.toBeUndefined();
    });

    it('creates PasswordResetToken with 1-hour expiry when user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrisma.passwordResetToken.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.requestPasswordReset('admin@example.com');

      const createCall = mockPrisma.passwordResetToken.create.mock.calls[0][0];
      const expiresAt: Date = createCall.data.expiresAt;
      const oneHourMs = 60 * 60 * 1000;
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + oneHourMs - 5000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + oneHourMs + 5000);
    });
  });

  // ─── resetPassword ───────────────────────────────────────────────────────────
  describe('resetPassword', () => {
    it('throws TOKEN_INVALID_OR_EXPIRED when token not found', async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue(null);
      await expect(service.resetPassword('bad-token', 'NewPass123!')).rejects.toMatchObject({
        message: 'TOKEN_INVALID_OR_EXPIRED',
      });
    });

    it('throws TOKEN_INVALID_OR_EXPIRED when token is expired', async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'prt-1',
        userId: 'user-1',
        token: 'tok',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      });
      await expect(service.resetPassword('tok', 'NewPass123!')).rejects.toMatchObject({
        message: 'TOKEN_INVALID_OR_EXPIRED',
      });
    });

    it('updates passwordHash and revokes all refresh tokens on success', async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'prt-1',
        userId: 'user-1',
        token: 'valid-tok',
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});
      mockPrisma.passwordResetToken.delete.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.resetPassword('valid-tok', 'NewPass123!');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' }, data: expect.objectContaining({ passwordHash: expect.any(String) }) }),
      );
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });
  });

  // ─── changePassword ──────────────────────────────────────────────────────────
  describe('changePassword', () => {
    it('throws CURRENT_PASSWORD_INCORRECT when user has no passwordHash (SSO-only user)', async () => {
      const ssoUser = { ...mockAdminUser, passwordHash: null };
      mockPrisma.user.findUnique.mockResolvedValue(ssoUser);
      await expect(
        service.changePassword('user-1', 'any-password', 'NewPass123!'),
      ).rejects.toMatchObject({ message: 'CURRENT_PASSWORD_INCORRECT' });
    });

    it('throws CURRENT_PASSWORD_INCORRECT when password does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      await expect(
        service.changePassword('user-1', 'WrongOldPass!', 'NewPass123!'),
      ).rejects.toMatchObject({ message: 'CURRENT_PASSWORD_INCORRECT' });
    });

    it('updates password and revokes all refresh tokens on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.changePassword('user-1', 'SecurePass123!', 'NewPass456!');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ passwordHash: expect.any(String) }) }),
      );
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: AuditAction.PASSWORD_CHANGE }) }),
      );
    });
  });

  // ─── revokeAllUserTokens ─────────────────────────────────────────────────────
  describe('revokeAllUserTokens', () => {
    it('calls refreshToken.deleteMany for the given userId', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });
      await service.revokeAllUserTokens('user-1');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });
  });

  // ─── getMe ───────────────────────────────────────────────────────────────────
  describe('getMe', () => {
    it('returns user with role and teamMemberships', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      const result = await service.getMe('user-1');
      expect(result).toMatchObject({ id: 'user-1', email: 'admin@example.com' });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ role: true, teamMemberships: expect.any(Object) }),
        }),
      );
    });
  });

  // ─── updateMe ────────────────────────────────────────────────────────────────
  describe('updateMe', () => {
    it('updates only provided fields', async () => {
      const dto: UpdateProfileDto = { firstName: 'NewFirst' };
      mockPrisma.user.update.mockResolvedValue({ ...mockAdminUser, firstName: 'NewFirst' });
      const result = await service.updateMe('user-1', dto);
      expect(result).toMatchObject({ firstName: 'NewFirst' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' }, data: { firstName: 'NewFirst' } }),
      );
    });
  });

  // ─── handleSsoCallback ────────────────────────────────────────────────────────
  describe('handleSsoCallback', () => {
    it('throws USER_NOT_PROVISIONED when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.handleSsoCallback('nobody@x.com', { cookie: jest.fn() } as never),
      ).rejects.toMatchObject({ message: 'USER_NOT_PROVISIONED' });
    });

    it('throws ACCOUNT_INACTIVE when user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockAdminUser, status: UserStatus.INACTIVE });
      await expect(
        service.handleSsoCallback('admin@example.com', { cookie: jest.fn() } as never),
      ).rejects.toMatchObject({ message: 'ACCOUNT_INACTIVE' });
    });

    it('calls login() and returns token when user is active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      const mockResponse = { cookie: jest.fn() };

      const result = await service.handleSsoCallback('admin@example.com', mockResponse as never);
      expect(result).toMatchObject({ accessToken: 'mock-jwt-token' });
    });
  });

  // ─── SSO config ──────────────────────────────────────────────────────────────
  describe('getSsoConfig', () => {
    it('returns config with cert redacted', async () => {
      mockPrisma.ssoConfig.findFirst.mockResolvedValue({
        id: 'sso-1',
        provider: 'SAML',
        isActive: true,
        config: { entryPoint: 'https://idp.example.com', cert: 'ENCRYPTED_CERT' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await service.getSsoConfig();
      expect((result?.config as Record<string, unknown>)['cert']).toBe('[REDACTED]');
    });
  });

  describe('updateSsoConfig', () => {
    it('upserts config and returns with cert redacted', async () => {
      const dto: SsoConfigDto = {
        provider: 'SAML' as never,
        isActive: true,
        config: { entryPoint: 'https://idp.example.com', cert: 'plain-cert' },
      };
      mockPrisma.ssoConfig.upsert.mockResolvedValue({
        id: 'sso-1',
        provider: 'SAML',
        isActive: true,
        config: { entryPoint: 'https://idp.example.com', cert: 'ENCRYPTED' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await service.updateSsoConfig(dto);
      expect(mockPrisma.ssoConfig.upsert).toHaveBeenCalled();
      expect((result?.config as Record<string, unknown>)['cert']).toBe('[REDACTED]');
    });
  });
});
