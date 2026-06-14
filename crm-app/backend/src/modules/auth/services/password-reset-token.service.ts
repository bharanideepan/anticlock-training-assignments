import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PasswordResetTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createAndSend(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    if (!user) return; // Don't reveal whether email exists

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });

    const resetUrl = `${this.config.get('FRONTEND_URL')}/password-reset?token=${rawToken}&email=${email}`;

    const transporter = nodemailer.createTransport({
      host: this.config.get('MAIL_HOST'),
      port: this.config.get<number>('MAIL_PORT'),
      secure: this.config.get<boolean>('MAIL_SECURE'),
    });

    await transporter.sendMail({
      from: this.config.get('MAIL_FROM'),
      to: email,
      subject: 'Password Reset — CRM',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 1 hour.</p>`,
    });
  }

  async consume(email: string, rawToken: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    if (!user) throw new BadRequestException('Invalid token');

    const tokens = await this.prisma.passwordResetToken.findMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    });

    for (const token of tokens) {
      if (await bcrypt.compare(rawToken, token.tokenHash)) {
        await this.prisma.passwordResetToken.update({
          where: { id: token.id },
          data: { usedAt: new Date() },
        });
        return user.id;
      }
    }

    throw new BadRequestException('Invalid or expired reset token');
  }
}
