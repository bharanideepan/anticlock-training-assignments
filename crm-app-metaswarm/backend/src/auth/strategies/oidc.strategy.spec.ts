import { OidcStrategy } from './oidc.strategy';

describe('OidcStrategy', () => {
  let strategy: OidcStrategy;

  beforeEach(() => {
    strategy = new OidcStrategy();
  });

  it('has name "oidc"', () => {
    expect(strategy.name).toBe('oidc');
  });

  describe('validate', () => {
    it('returns the profile unchanged', () => {
      const profile = { sub: 'user-123', email: 'user@example.com' };

      const result = strategy.validate(profile);

      expect(result).toBe(profile);
    });
  });
});
