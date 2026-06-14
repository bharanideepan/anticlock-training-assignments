import { Injectable } from '@nestjs/common';
import { SsoProvider } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../../common/services/crypto.service';

export interface SsoConfigData {
  provider: SsoProvider;
  isActive: boolean;
  config: Record<string, unknown>;
}

@Injectable()
export class SsoConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async getActive(): Promise<SsoConfigData | null> {
    const record = await this.prisma.ssoConfig.findFirst({
      where: { isActive: true },
    });
    if (!record) return null;
    return {
      provider: record.provider,
      isActive: record.isActive,
      config: JSON.parse(
        this.crypto.decrypt(JSON.stringify(record.config)),
      ) as Record<string, unknown>,
    };
  }

  async get(): Promise<SsoConfigData | null> {
    const record = await this.prisma.ssoConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return null;
    return {
      provider: record.provider,
      isActive: record.isActive,
      config: JSON.parse(
        this.crypto.decrypt(JSON.stringify(record.config)),
      ) as Record<string, unknown>,
    };
  }

  async upsert(data: SsoConfigData): Promise<SsoConfigData> {
    const encryptedConfig = this.crypto.encrypt(JSON.stringify(data.config));
    const existing = await this.prisma.ssoConfig.findFirst();

    const record = existing
      ? await this.prisma.ssoConfig.update({
          where: { id: existing.id },
          data: {
            provider: data.provider,
            isActive: data.isActive,
            config: encryptedConfig,
          },
        })
      : await this.prisma.ssoConfig.create({
          data: {
            provider: data.provider,
            isActive: data.isActive,
            config: encryptedConfig,
          },
        });

    return {
      provider: record.provider,
      isActive: record.isActive,
      config: data.config,
    };
  }
}
