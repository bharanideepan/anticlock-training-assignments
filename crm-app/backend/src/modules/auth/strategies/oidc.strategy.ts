import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

/**
 * OIDC strategy placeholder — actual openid-client flow is handled in
 * AuthService.initiateSso() and AuthController.ssoCallback() using the
 * openid-client library directly, as it requires async IdP config lookup.
 */
@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  constructor() {
    super({ usernameField: 'email', passwordField: 'code' });
  }

  validate(email: string, _code: string): any {
    return { email };
  }
}
