import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SsoConfigService } from './services/sso-config.service';
import { LoginDto } from './dto/login.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../../common/decorators/public.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly ssoConfigService: SsoConfigService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.loginWithPassword(dto.email, dto.password);
    res.cookie('crm_refresh', refreshToken, COOKIE_OPTIONS);
    return { accessToken };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.crm_refresh as string | undefined;
    if (!rawToken) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        error: { code: 'NO_REFRESH_TOKEN', message: 'Refresh token missing' },
      });
      return;
    }
    const { accessToken, refreshToken } =
      await this.authService.refreshTokens(rawToken);
    res.cookie('crm_refresh', refreshToken, COOKIE_OPTIONS);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sub);
    res.clearCookie('crm_refresh', { path: '/' });
  }

  @Post('password/reset-request')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestReset(@Body() dto: PasswordResetRequestDto) {
    await this.authService.requestPasswordReset(dto.email);
  }

  @Post('password/reset')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: PasswordResetDto) {
    await this.authService.resetPassword(dto.email, dto.token, dto.newPassword);
  }

  @Post('password/change')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get('me')
  async getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.sub, dto);
  }

  @Get('sso/config')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async getSsoConfig() {
    return this.ssoConfigService.get();
  }

  @Post('sso/config')
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async upsertSsoConfig(
    @Body()
    body: {
      provider: 'SAML' | 'OIDC';
      isActive: boolean;
      config: Record<string, unknown>;
    },
  ) {
    return this.ssoConfigService.upsert(body);
  }

  @Get('sso/initiate')
  @Public()
  async initiateSso(@Res() res: Response) {
    const config = await this.ssoConfigService.getActive();
    if (!config) {
      return res.status(HttpStatus.NOT_FOUND).json({
        error: {
          code: 'SSO_NOT_CONFIGURED',
          message: 'SSO is not configured',
        },
      });
    }
    return res.redirect(`${config.config['entryPoint'] as string}`);
  }

  @Get('sso/callback')
  @Public()
  ssoCallback(@Req() req: Request, @Res() res: Response) {
    const email = (req.query['email'] as string) ?? '';
    if (!email)
      return res.status(HttpStatus.BAD_REQUEST).send('Missing email from IdP');
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=sso-placeholder&email=${email}`,
    );
  }
}
