import { Injectable } from '@nestjs/common';

// TODO: Implement OIDC strategy using openid-client v5
// Replace this stub with Issuer.discover() + custom Passport strategy
// Requires: OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET env vars
@Injectable()
export class OidcStrategy {
  readonly name = 'oidc';

  validate(profile: Record<string, unknown>): Record<string, unknown> {
    return profile;
  }
}
