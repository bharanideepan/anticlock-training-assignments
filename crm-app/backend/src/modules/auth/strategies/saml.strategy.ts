import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, SamlConfig } from 'passport-saml';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy, 'saml') {
  constructor(_prisma: PrismaService) {
    // Config is loaded dynamically from SsoConfig table at runtime.
    // Minimal static config required by PassportStrategy constructor.
    super({
      entryPoint: 'https://placeholder.idp/sso',
      issuer: 'crm-app',
      callbackUrl: `${process.env.APP_URL}/api/v1/auth/sso/callback`,
    } as SamlConfig);
  }

  validate(profile: Record<string, unknown>): {
    email: string;
    attributes: Record<string, unknown>;
  } {
    const email = (profile['nameID'] as string) ?? (profile['email'] as string);
    return { email, attributes: profile };
  }
}
