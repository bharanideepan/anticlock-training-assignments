import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SsoConfigDto } from './dto/sso-config.dto';
import { SsoProvider } from '@prisma/client';

const mockAuthService = {
  login: jest.fn().mockResolvedValue({ accessToken: 'jwt-token', expiresIn: 900 }),
  logout: jest.fn().mockResolvedValue(undefined),
  refreshAccessToken: jest.fn().mockResolvedValue({ accessToken: 'new-jwt', expiresIn: 900 }),
  requestPasswordReset: jest.fn().mockResolvedValue(undefined),
  resetPassword: jest.fn().mockResolvedValue(undefined),
  changePassword: jest.fn().mockResolvedValue(undefined),
  getMe: jest.fn().mockResolvedValue({ id: 'user-1', email: 'admin@example.com', role: { name: 'SYSTEM_ADMINISTRATOR' } }),
  updateMe: jest.fn().mockResolvedValue({ id: 'user-1', email: 'admin@example.com', firstName: 'NewFirst', role: { name: 'SYSTEM_ADMINISTRATOR' } }),
  handleSsoCallback: jest.fn().mockResolvedValue({ accessToken: 'sso-jwt', expiresIn: 900 }),
  getSsoConfig: jest.fn().mockResolvedValue({ id: 'sso-1', provider: 'SAML', config: { cert: '[REDACTED]' } }),
  updateSsoConfig: jest.fn().mockResolvedValue({ id: 'sso-1', provider: 'SAML', config: { cert: '[REDACTED]' } }),
};

const mockRequest = (overrides: Record<string, unknown> = {}) => ({
  // Matches LocalStrategy output (full Prisma user) for login; sub present for JWT-protected endpoints
  user: {
    sub: 'user-1',
    id: 'user-1',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: { id: 'role-admin', name: 'SYSTEM_ADMINISTRATOR' },
    teamIds: [],
    teamMemberships: [],
  },
  cookies: { crm_refresh: 'token-id:raw-token' },
  ...overrides,
});

const mockResponse = () => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
});

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(AuthGuard('local')).useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard('saml')).useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('POST /auth/login', () => {
    it('calls authService.login and returns 200 with data envelope', async () => {
      const req = mockRequest();
      const res = mockResponse();

      const result = await controller.login(req as never, res as never);

      expect(mockAuthService.login).toHaveBeenCalledWith(req.user, res);
      expect(result).toMatchObject({ data: expect.objectContaining({ accessToken: 'jwt-token', expiresIn: 900 }) });
    });

    it('includes user object in the response data', async () => {
      const req = mockRequest();
      const res = mockResponse();

      const result = await controller.login(req as never, res as never);

      expect(result).toMatchObject({
        data: expect.objectContaining({ user: expect.objectContaining({ id: 'user-1', email: 'admin@example.com' }) }),
      });
    });
  });

  describe('POST /auth/sso/callback', () => {
    it('calls authService.handleSsoCallback with email from req.user and returns data', async () => {
      const req = mockRequest({ user: { email: 'sso@example.com', nameID: 'sso@example.com' } });
      const res = mockResponse();

      const result = await controller.ssoCallback(req as never, res as never);

      expect(mockAuthService.handleSsoCallback).toHaveBeenCalledWith('sso@example.com', res);
      expect(result).toMatchObject({ data: expect.objectContaining({ accessToken: 'sso-jwt' }) });
    });
  });

  describe('POST /auth/refresh', () => {
    it('reads crm_refresh cookie and calls authService.refreshAccessToken', async () => {
      const req = mockRequest();
      const res = mockResponse();

      const result = await controller.refresh(req as never, res as never);

      expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith('token-id:raw-token', res);
      expect(result).toMatchObject({ data: expect.objectContaining({ accessToken: 'new-jwt' }) });
    });
  });

  describe('POST /auth/logout', () => {
    it('calls authService.logout with userId and cookie value', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await controller.logout(req as never, res as never);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-1', 'token-id:raw-token', res);
    });
  });

  describe('POST /auth/password/reset-request', () => {
    it('calls authService.requestPasswordReset and returns 202', async () => {
      const dto: PasswordResetRequestDto = { email: 'admin@example.com' };

      const result = await controller.resetRequest(dto);

      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith('admin@example.com');
      expect(result).toEqual({ status: HttpStatus.ACCEPTED });
    });
  });

  describe('POST /auth/password/reset', () => {
    it('calls authService.resetPassword with token and newPassword', async () => {
      const dto: PasswordResetDto = { token: 'reset-tok', newPassword: 'NewPass123!' };

      await controller.reset(dto);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith('reset-tok', 'NewPass123!');
    });
  });

  describe('POST /auth/password/change', () => {
    it('calls authService.changePassword with userId from JWT payload', async () => {
      const dto: ChangePasswordDto = { currentPassword: 'OldPass!', newPassword: 'NewPass123!' };
      const req = mockRequest();

      await controller.changePassword(req as never, dto);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith('user-1', 'OldPass!', 'NewPass123!');
    });
  });

  describe('GET /auth/me', () => {
    it('calls authService.getMe with userId and returns data', async () => {
      const req = mockRequest();

      const result = await controller.getMe(req as never);

      expect(mockAuthService.getMe).toHaveBeenCalledWith('user-1');
      expect(result).toMatchObject({ data: expect.objectContaining({ id: 'user-1' }) });
    });
  });

  describe('PATCH /auth/me', () => {
    it('calls authService.updateMe with userId and dto, returns data', async () => {
      const dto: UpdateProfileDto = { firstName: 'NewFirst' };
      const req = mockRequest();

      const result = await controller.updateMe(req as never, dto);

      expect(mockAuthService.updateMe).toHaveBeenCalledWith('user-1', dto);
      expect(result).toMatchObject({ data: expect.objectContaining({ id: 'user-1' }) });
    });
  });

  describe('GET /auth/sso/config', () => {
    it('calls authService.getSsoConfig and returns data', async () => {
      const result = await controller.getSsoConfig();

      expect(mockAuthService.getSsoConfig).toHaveBeenCalled();
      expect(result).toMatchObject({ data: expect.objectContaining({ provider: 'SAML' }) });
    });
  });

  describe('PUT /auth/sso/config', () => {
    it('calls authService.updateSsoConfig with dto and returns data', async () => {
      const dto: SsoConfigDto = {
        provider: SsoProvider.SAML,
        isActive: true,
        config: { entryPoint: 'https://idp.example.com', cert: 'plain-cert' },
      };

      const result = await controller.updateSsoConfig(dto);

      expect(mockAuthService.updateSsoConfig).toHaveBeenCalledWith(dto);
      expect(result).toMatchObject({ data: expect.objectContaining({ provider: 'SAML' }) });
    });
  });
});
