import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async create(userId: string): Promise<string> {
    const rawToken = randomBytes(40).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const ttl = this.config.get<number>('JWT_REFRESH_TTL', 604800);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });

    return rawToken;
  }

  async rotate(
    rawToken: string,
  ): Promise<{ userId: string; newRawToken: string }> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
    });

    for (const token of tokens) {
      if (await bcrypt.compare(rawToken, token.tokenHash)) {
        const newRawToken = randomBytes(40).toString('hex');
        const newHash = await bcrypt.hash(newRawToken, 10);
        const ttl = this.config.get<number>('JWT_REFRESH_TTL', 604800);

        const newToken = await this.prisma.refreshToken.create({
          data: {
            userId: token.userId,
            tokenHash: newHash,
            expiresAt: new Date(Date.now() + ttl * 1000),
          },
        });

        await this.prisma.refreshToken.update({
          where: { id: token.id },
          data: { revokedAt: new Date(), replacedByTokenId: newToken.id },
        });

        return { userId: token.userId, newRawToken };
      }
    }

    throw new Error('Invalid or expired refresh token');
  }

  async revoke(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
