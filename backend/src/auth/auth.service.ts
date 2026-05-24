import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma.service';
import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  csrfCookieClearOptions,
  csrfCookieOptions,
  sessionCookieClearOptions,
  sessionCookieOptions,
} from './auth.constants';
import type {
  PublicUser,
  SessionRequestMetadata,
  UserRecordLike,
} from './auth.types';
import { toPublicUser } from './auth.types';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

interface SignupInput {
  email: string;
  password: string;
  firstName: string | null;
  lastName: string | null;
}

interface LoginInput {
  email: string;
  password: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
  ) {}

  async signup(
    payload: unknown,
    metadata: SessionRequestMetadata,
    response: Response,
  ): Promise<{ user: PublicUser }> {
    const input = this.parseSignupPayload(payload);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await this.passwordService.hashPassword(
      input.password,
    );

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
      },
    });

    await this.attachSessionCookies(response, user.id, metadata);
    return { user: this.asPublicUser(user) };
  }

  async login(
    payload: unknown,
    metadata: SessionRequestMetadata,
    response: Response,
  ): Promise<{ user: PublicUser }> {
    const input = this.parseLoginPayload(payload);

    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.passwordService.verifyPassword(
      input.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.attachSessionCookies(response, user.id, metadata);
    return { user: this.asPublicUser(user) };
  }

  async logout(
    sessionId: string,
    response: Response,
  ): Promise<{ success: true }> {
    await this.sessionService.revokeSession(sessionId);
    this.clearAuthCookies(response);

    return { success: true };
  }

  async logoutAll(
    userId: string,
    response: Response,
  ): Promise<{ success: true; revokedCount: number }> {
    const revokedCount =
      await this.sessionService.revokeAllSessionsForUser(userId);
    this.clearAuthCookies(response);

    return {
      success: true,
      revokedCount,
    };
  }

  clearAuthCookies(response: Response): void {
    response.clearCookie(SESSION_COOKIE_NAME, sessionCookieClearOptions());
    response.clearCookie(CSRF_COOKIE_NAME, csrfCookieClearOptions());
  }

  private async attachSessionCookies(
    response: Response,
    userId: string,
    metadata: SessionRequestMetadata,
  ): Promise<void> {
    const session = await this.sessionService.createSession(userId, metadata);
    const maxAge = session.expiresAt.getTime() - Date.now();

    response.cookie(
      SESSION_COOKIE_NAME,
      session.sessionToken,
      sessionCookieOptions(maxAge),
    );
    response.cookie(
      CSRF_COOKIE_NAME,
      session.csrfToken,
      csrfCookieOptions(maxAge),
    );
  }

  private parseSignupPayload(payload: unknown): SignupInput {
    if (!isRecord(payload)) {
      throw new BadRequestException('Request body must be an object');
    }

    const email = this.readEmail(payload.email);
    const password = this.readPassword(payload.password);
    const firstName = this.readOptionalName(payload.firstName);
    const lastName = this.readOptionalName(payload.lastName);

    return { email, password, firstName, lastName };
  }

  private parseLoginPayload(payload: unknown): LoginInput {
    if (!isRecord(payload)) {
      throw new BadRequestException('Request body must be an object');
    }

    return {
      email: this.readEmail(payload.email),
      password: this.readPassword(payload.password),
    };
  }

  private readEmail(emailValue: unknown): string {
    if (typeof emailValue !== 'string') {
      throw new BadRequestException('Email is required');
    }

    const normalized = emailValue.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !normalized ||
      normalized.length > 254 ||
      !emailPattern.test(normalized)
    ) {
      throw new BadRequestException('Email format is invalid');
    }

    return normalized;
  }

  private readPassword(passwordValue: unknown): string {
    if (typeof passwordValue !== 'string') {
      throw new BadRequestException('Password is required');
    }

    const password = passwordValue.trim();
    if (password.length < 8 || password.length > 72) {
      throw new BadRequestException(
        'Password must be between 8 and 72 characters',
      );
    }

    return password;
  }

  private readOptionalName(nameValue: unknown): string | null {
    if (nameValue === undefined || nameValue === null) {
      return null;
    }

    if (typeof nameValue !== 'string') {
      throw new BadRequestException('Name must be a string');
    }

    const normalized = nameValue.trim();
    if (!normalized) {
      return null;
    }

    if (normalized.length > 120) {
      throw new BadRequestException('Name must be at most 120 characters');
    }

    return normalized;
  }

  private asPublicUser(user: UserRecordLike): PublicUser {
    return toPublicUser(user);
  }
}
