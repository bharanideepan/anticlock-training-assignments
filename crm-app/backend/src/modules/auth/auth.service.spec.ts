import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { PasswordResetTokenService } from './services/password-reset-token.service';

const mockUser = {
  id: 'user-1',
  email: 'admin@crm.local',
  passwordHash: 'hashed',
  status: 'ACTIVE',
  role: { name: 'SYSTEM_ADMINISTRATOR' },
  teams: [],
  deletedAt: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findFirst: jest.fn() },
            auditLog: { create: jest.fn() },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('secret') },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            create: jest.fn().mockResolvedValue({ token: 'refresh-token' }),
          },
        },
        {
          provide: PasswordResetTokenService,
          useValue: { create: jest.fn(), consume: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
  });

  describe('loginWithPassword', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.loginWithPassword('x@x.com', 'pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException for non-admin role', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        role: { name: 'SALES_REPRESENTATIVE' },
      });
      await expect(
        service.loginWithPassword('admin@crm.local', 'pass'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      await expect(
        service.loginWithPassword('admin@crm.local', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens for valid admin credentials', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      const result = await service.loginWithPassword(
        'admin@crm.local',
        'Admin@123',
      );
      expect(result).toHaveProperty('accessToken');
    });
  });
});
