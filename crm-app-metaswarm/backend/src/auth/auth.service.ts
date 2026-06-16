import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditAction, RoleName, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SsoConfigDto } from './dto/sso-config.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { encryptSsoCert } from './crypto/sso-crypto.util';

interface LoginUser {
  id: string;
  email: string;
  role: { name: string };
  teamMemberships: Array<{ teamId: string }>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('MAILER_SERVICE')
    private readonly mailer: { sendMail(opts: object): Promise<unknown> },
  ) {}

  async validateUser(email: string, password: string): Promise<Record<string, unknown> | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true, teamMemberships: { include: { team: true } } },
    });

    if (!user) {
      await this.prisma.auditLog.create({
        data: { action: AuditAction.LOGIN_FAILED, resourceType: 'User', resourceId: email },
      });
      return null;
    }

    if (user.role.name !== RoleName.SYSTEM_ADMINISTRATOR) {
      await this.prisma.auditLog.create({
        data: { action: AuditAction.LOGIN_FAILED, resourceType: 'User', resourceId: user.id },
      });
      return null;
    }

    if (user.status !== UserStatus.ACTIVE) {
      await this.prisma.auditLog.create({
        data: { action: AuditAction.LOGIN_FAILED, resourceType: 'User', resourceId: user.id },
      });
      return null;
    }

    if (!user.passwordHash) {
      await this.prisma.auditLog.create({
        data: { action: AuditAction.LOGIN_FAILED, resourceType: 'User', resourceId: user.id },
      });
      return null;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.prisma.auditLog.create({
        data: { action: AuditAction.LOGIN_FAILED, resourceType: 'User', resourceId: user.id },
      });
      return null;
    }

    return user as unknown as Record<string, unknown>;
  }

  async login(
    user: Record<string, unknown>,
    res: Response,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const u = user as unknown as LoginUser;
    const teamIds = u.teamMemberships.map((m) => m.teamId);
    const payload = { sub: u.id, email: u.email, role: u.role.name, teamIds };
    const accessToken = this.jwtService.sign(payload);

    const tokenId = randomUUID();
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const days = parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRY_DAYS') ?? '7', 10);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { id: tokenId, userId: u.id, tokenHash, expiresAt },
    });

    res.cookie('crm_refresh', `${tokenId}:${rawToken}`, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.LOGIN, actorId: u.id, resourceType: 'User', resourceId: u.id },
    });

    return { accessToken, expiresIn: 900 };
  }

  async logout(userId: string, cookieValue: string, res: Response): Promise<void> {
    const colonIndex = cookieValue.indexOf(':');
    const tokenId = colonIndex >= 0 ? cookieValue.substring(0, colonIndex) : cookieValue;

    const stored = await this.prisma.refreshToken.findFirst({ where: { id: tokenId } });
    if (stored) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    }

    res.clearCookie('crm_refresh');

    await this.prisma.auditLog.create({
      data: { action: AuditAction.LOGOUT, actorId: userId, resourceType: 'User', resourceId: userId },
    });
  }

  async refreshAccessToken(
    cookieValue: string,
    res: Response,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const colonIndex = cookieValue.indexOf(':');
    const tokenId = colonIndex >= 0 ? cookieValue.substring(0, colonIndex) : '';
    const rawToken = colonIndex >= 0 ? cookieValue.substring(colonIndex + 1) : cookieValue;

    const stored = await this.prisma.refreshToken.findFirst({ where: { id: tokenId } });
    if (!stored) {
      throw new UnauthorizedException('REFRESH_TOKEN_INVALID');
    }

    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('REFRESH_TOKEN_EXPIRED');
    }

    const valid = await bcrypt.compare(rawToken, stored.tokenHash);
    if (!valid) {
      throw new UnauthorizedException('REFRESH_TOKEN_INVALID');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      include: { role: true, teamMemberships: { include: { team: true } } },
    });
    if (!user) {
      throw new UnauthorizedException('REFRESH_TOKEN_INVALID');
    }

    return this.login(user as unknown as Record<string, unknown>, res);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? '';
    await this.mailer.sendMail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `<p><a href="${frontendUrl}/reset-password?token=${rawToken}">Reset your password</a> (expires in 1 hour)</p>`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const stored = await this.prisma.passwordResetToken.findFirst({ where: { tokenHash } });

    if (!stored || stored.expiresAt < new Date()) {
      throw new BadRequestException('TOKEN_INVALID_OR_EXPIRED');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: stored.userId }, data: { passwordHash: newHash } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: stored.userId } });
    await this.prisma.passwordResetToken.delete({ where: { id: stored.id } });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.PASSWORD_RESET,
        resourceType: 'User',
        resourceId: stored.userId,
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new BadRequestException('CURRENT_PASSWORD_INCORRECT');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('CURRENT_PASSWORD_INCORRECT');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.PASSWORD_CHANGE,
        actorId: userId,
        resourceType: 'User',
        resourceId: userId,
      },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async getMe(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, teamMemberships: { include: { team: true } } },
    });
    return user as unknown as Record<string, unknown>;
  }

  async updateMe(userId: string, dto: UpdateProfileDto): Promise<Record<string, unknown>> {
    const data: Record<string, string> = {};
    if (dto.firstName !== undefined) data['firstName'] = dto.firstName;
    if (dto.lastName !== undefined) data['lastName'] = dto.lastName;
    if (dto.phone !== undefined) data['phone'] = dto.phone;
    if (dto.jobTitle !== undefined) data['jobTitle'] = dto.jobTitle;

    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return user as unknown as Record<string, unknown>;
  }

  async handleSsoCallback(
    email: string,
    res: Response,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true, teamMemberships: { include: { team: true } } },
    });

    if (!user) throw new UnauthorizedException('USER_NOT_PROVISIONED');
    if (user.status !== UserStatus.ACTIVE) throw new ForbiddenException('ACCOUNT_INACTIVE');

    return this.login(user as unknown as Record<string, unknown>, res);
  }

  async getSsoConfig(): Promise<Record<string, unknown> | null> {
    const config = await this.prisma.ssoConfig.findFirst({ where: { isActive: true } });
    if (!config) return null;
    return this.redactSsoCert(config as unknown as Record<string, unknown>);
  }

  async updateSsoConfig(dto: SsoConfigDto): Promise<Record<string, unknown>> {
    const ssoKey = this.configService.get<string>('SSO_ENCRYPTION_KEY') ?? '';
    const configData = { ...dto.config };

    if (typeof configData['cert'] === 'string') {
      configData['cert'] = encryptSsoCert(configData['cert'], ssoKey);
    }

    const jsonConfig = configData as Parameters<typeof this.prisma.ssoConfig.create>[0]['data']['config'];
    const result = await this.prisma.ssoConfig.upsert({
      where: { id: 'sso-config-singleton' },
      create: { id: 'sso-config-singleton', provider: dto.provider, isActive: dto.isActive, config: jsonConfig },
      update: { provider: dto.provider, isActive: dto.isActive, config: jsonConfig },
    });

    return this.redactSsoCert(result as unknown as Record<string, unknown>);
  }

  private redactSsoCert(record: Record<string, unknown>): Record<string, unknown> {
    const config = record['config'] as Record<string, unknown> | undefined;
    if (!config || typeof config['cert'] === 'undefined') return record;
    return { ...record, config: { ...config, cert: '[REDACTED]' } };
  }
}
