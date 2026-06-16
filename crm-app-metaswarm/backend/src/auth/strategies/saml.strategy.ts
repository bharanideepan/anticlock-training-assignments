import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from '@node-saml/passport-saml';

// TODO: Load config from SsoConfig table (encrypted) at runtime
// Requires: SAML_ENTRY_POINT, SAML_ISSUER, SAML_CERT env vars or DB config
@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy, 'saml') {
  constructor() {
    super({
      entryPoint: process.env.SAML_ENTRY_POINT ?? 'https://idp.example.com/saml/login',
      issuer: process.env.SAML_ISSUER ?? 'crm-app',
      cert: process.env.SAML_CERT ?? 'TODO_CONFIGURE',
      callbackUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/auth/sso/callback`,
    });
  }

  validate(profile: Profile | null): string | null {
    return profile?.nameID ?? null;
  }
}
