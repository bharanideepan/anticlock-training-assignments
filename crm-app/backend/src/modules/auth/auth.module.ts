import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenService } from './services/refresh-token.service';
import { PasswordResetTokenService } from './services/password-reset-token.service';
import { SsoConfigService } from './services/sso-config.service';
import { CryptoService } from '../../common/services/crypto.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<number>('JWT_ACCESS_TTL', 900) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenService,
    PasswordResetTokenService,
    SsoConfigService,
    CryptoService,
  ],
  exports: [AuthService, JwtModule, RefreshTokenService, PasswordResetTokenService],
})
export class AuthModule {}
