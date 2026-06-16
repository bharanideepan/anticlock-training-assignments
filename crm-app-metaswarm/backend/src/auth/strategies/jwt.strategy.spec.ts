import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  const payload = {
    sub: 'user-id',
    email: 'user@example.com',
    role: 'SYSTEM_ADMINISTRATOR',
    teamIds: ['team-1'],
    iat: 1234567890,
    exp: 1234567890,
  };

  describe('validate', () => {
    it('returns the JWT payload unchanged when JWT_SECRET is configured', () => {
      const configService = { get: () => 'test-jwt-secret' } as unknown as ConfigService;
      const strategy = new JwtStrategy(configService);

      const result = strategy.validate(payload);

      expect(result).toBe(payload);
    });

    it('uses fallback secret when JWT_SECRET is not configured', () => {
      const configService = { get: () => undefined } as unknown as ConfigService;
      const strategy = new JwtStrategy(configService);

      const result = strategy.validate(payload);

      expect(result).toBe(payload);
    });
  });
});
