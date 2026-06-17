import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SsoConfigDto } from './dto/sso-config.dto';
import { RoleName } from '@prisma/client';

interface RequestWithUser extends Request {
  user: Record<string, unknown>;
  cookies: Record<string, string>;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  async login(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: Record<string, unknown> }> {
    const token = await this.authService.login(req.user, res);
    const user = req.user as Record<string, unknown>;
    return {
      data: {
        ...token,
        user: {
          id: user['id'],
          email: user['email'],
          firstName: user['firstName'],
          lastName: user['lastName'],
          role: (user['role'] as { name: string } | undefined)?.name,
        },
      },
    };
  }

  @Post('sso/initiate')
  @HttpCode(HttpStatus.FOUND)
  @UseGuards(AuthGuard('saml'))
  ssoInitiate(): void {
    // Passport redirects to IdP
  }

  @Get('sso/callback')
  @UseGuards(AuthGuard('saml'))
  async ssoCallback(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: Record<string, unknown> }> {
    const email = (req.user['email'] ?? req.user['nameID']) as string;
    const token = await this.authService.handleSsoCallback(email, res);
    return { data: token as unknown as Record<string, unknown> };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: Record<string, unknown> }> {
    const cookieValue = req.cookies['crm_refresh'] ?? '';
    const token = await this.authService.refreshAccessToken(cookieValue, res);
    return { data: token as unknown as Record<string, unknown> };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const payload = req.user as unknown as JwtPayload;
    const cookieValue = req.cookies['crm_refresh'] ?? '';
    await this.authService.logout(payload.sub, cookieValue, res);
  }

  @Post('password/reset-request')
  @HttpCode(HttpStatus.ACCEPTED)
  async resetRequest(
    @Body() dto: PasswordResetRequestDto,
  ): Promise<{ status: number }> {
    await this.authService.requestPasswordReset(dto.email);
    return { status: HttpStatus.ACCEPTED };
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reset(@Body() dto: PasswordResetDto): Promise<void> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async changePassword(
    @Req() req: RequestWithUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    const payload = req.user as unknown as JwtPayload;
    await this.authService.changePassword(payload.sub, dto.currentPassword, dto.newPassword);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(
    @Req() req: RequestWithUser,
  ): Promise<{ data: Record<string, unknown> }> {
    const payload = req.user as unknown as JwtPayload;
    const user = await this.authService.getMe(payload.sub);
    return { data: user };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<{ data: Record<string, unknown> }> {
    const payload = req.user as unknown as JwtPayload;
    const user = await this.authService.updateMe(payload.sub, dto);
    return { data: user };
  }

  @Get('sso/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async getSsoConfig(): Promise<{ data: Record<string, unknown> | null }> {
    const config = await this.authService.getSsoConfig();
    return { data: config };
  }

  @Put('sso/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.SYSTEM_ADMINISTRATOR)
  async updateSsoConfig(
    @Body() dto: SsoConfigDto,
  ): Promise<{ data: Record<string, unknown> }> {
    const config = await this.authService.updateSsoConfig(dto);
    return { data: config };
  }
}

// Suppress unused-import warning — LoginDto is used by Swagger consumers
void LoginDto;
void CurrentUser;
