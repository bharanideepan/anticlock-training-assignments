import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';

const mockAuthService = {
  validateUser: jest.fn(),
} as unknown as AuthService;

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new LocalStrategy(mockAuthService);
  });

  describe('validate', () => {
    it('returns the user when credentials are valid', async () => {
      const user = { id: 'user-1', email: 'admin@example.com', role: { name: 'SYSTEM_ADMINISTRATOR' } };
      (mockAuthService.validateUser as jest.Mock).mockResolvedValue(user);

      const result = await strategy.validate('admin@example.com', 'Pass@word1');

      expect(mockAuthService.validateUser).toHaveBeenCalledWith('admin@example.com', 'Pass@word1');
      expect(result).toBe(user);
    });

    it('throws UnauthorizedException when validateUser returns null', async () => {
      (mockAuthService.validateUser as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate('wrong@example.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
