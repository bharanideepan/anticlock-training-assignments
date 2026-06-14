import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { PasswordResetTokenService } from './services/password-reset-token.service';
import { requestContext } from '../../common/context/async-local-storage';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly passwordResetTokenService: PasswordResetTokenService,
  ) {}

  async loginWithPassword(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: { role: true, teams: { include: { team: true } } },
    });

    if (!user || !user.passwordHash) {
      await this.logFailedLogin(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role.name !== RoleName.SYSTEM_ADMINISTRATOR) {
      throw new ForbiddenException(
        'Password login is restricted to system administrators',
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.logFailedLogin(email, user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  async issueTokens(user: {
    id: string;
    email: string;
    role: { name: string };
    teams: Array<{ teamId: string }>;
  }) {
    const teamIds = user.teams.map((t) => t.teamId);
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      teamIds,
    };
    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get<number>('JWT_ACCESS_TTL', 900),
    });
    const refreshToken = await this.refreshTokenService.create(user.id);
    return { accessToken, refreshToken };
  }

  async refreshTokens(rawRefreshToken: string) {
    try {
      const { userId, newRawToken } =
        await this.refreshTokenService.rotate(rawRefreshToken);
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { role: true, teams: true },
      });
      const teamIds = user.teams.map((t) => t.teamId);
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role.name,
        teamIds,
      };
      const accessToken = this.jwt.sign(payload, {
        expiresIn: this.config.get<number>('JWT_ACCESS_TTL', 900),
      });
      return { accessToken, refreshToken: newRawToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokenService.revoke(userId);
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.passwordResetTokenService.createAndSend(email);
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<void> {
    const userId = await this.passwordResetTokenService.consume(email, token);
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (
      !user.passwordHash ||
      !(await bcrypt.compare(currentPassword, user.passwordHash))
    ) {
      throw new BadRequestException('Current password is incorrect');
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });
  }

  async getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        role: true,
        teams: { include: { team: { select: { id: true, name: true } } } },
      },
    });
  }

  async updateProfile(
    userId: string,
    dto: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      jobTitle?: string;
    },
  ) {
    return this.prisma.user.update({ where: { id: userId }, data: dto });
  }

  private async logFailedLogin(email: string, userId?: string) {
    const ctx = requestContext.getStore();
    await this.prisma.auditLog.create({
      data: {
        actorId: userId ?? null,
        action: 'LOGIN_FAILED',
        resourceType: 'User',
        ipAddress: ctx?.ipAddress,
        traceId: ctx?.traceId,
        newValue: { email },
      },
    });
  }
}
