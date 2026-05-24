import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CsrfGuard } from './csrf.guard';
import { CurrentUser } from './current-user.decorator';
import { SessionAuthGuard } from './session-auth.guard';
import type {
  PublicUser,
  RequestWithAuth,
  SessionRequestMetadata,
} from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.signup(
      body,
      this.extractSessionMetadata(request),
      response,
    );
  }

  @Post('login')
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(
      body,
      this.extractSessionMetadata(request),
      response,
    );
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  getMe(@CurrentUser() user: PublicUser) {
    return { user };
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard, CsrfGuard)
  async logout(
    @Req() request: RequestWithAuth,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = request.authSession;
    if (!session) {
      this.authService.clearAuthCookies(response);
      return { success: true };
    }

    return this.authService.logout(session.id, response);
  }

  @Post('logout-all')
  @UseGuards(SessionAuthGuard, CsrfGuard)
  async logoutAll(
    @Req() request: RequestWithAuth,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = request.authUser;
    if (!user) {
      this.authService.clearAuthCookies(response);
      return { success: true, revokedCount: 0 };
    }

    return this.authService.logoutAll(user.id, response);
  }

  private extractSessionMetadata(request: Request): SessionRequestMetadata {
    return {
      ip: this.readIpAddress(request),
      userAgent: this.readUserAgent(request),
    };
  }

  private readIpAddress(request: Request): string | null {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      const firstIp = forwardedFor.split(',')[0]?.trim();
      return firstIp || null;
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      const firstIp = forwardedFor[0]?.trim();
      return firstIp || null;
    }

    return request.ip ?? null;
  }

  private readUserAgent(request: Request): string | null {
    const userAgent = request.get('user-agent');
    return userAgent?.trim() || null;
  }
}
