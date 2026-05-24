import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'sid';
export const CSRF_COOKIE_NAME = 'csrf_token';

const DEFAULT_SESSION_TTL_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parsePositiveNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function getSessionTtlMs(): number {
  const configuredDays = parsePositiveNumber(process.env.SESSION_TTL_DAYS);
  const days = configuredDays ?? DEFAULT_SESSION_TTL_DAYS;
  return days * MS_PER_DAY;
}

function isCookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === 'true') {
    return true;
  }

  if (process.env.COOKIE_SECURE === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'production';
}

function getCookieDomain(): string | undefined {
  return process.env.COOKIE_DOMAIN || undefined;
}

function baseCookieOptions(maxAge: number): CookieOptions {
  return {
    sameSite: 'lax',
    secure: isCookieSecure(),
    domain: getCookieDomain(),
    path: '/',
    maxAge,
  };
}

export function sessionCookieOptions(maxAge: number): CookieOptions {
  return {
    ...baseCookieOptions(maxAge),
    httpOnly: true,
  };
}

export function csrfCookieOptions(maxAge: number): CookieOptions {
  return {
    ...baseCookieOptions(maxAge),
    httpOnly: false,
  };
}

export function sessionCookieClearOptions(): CookieOptions {
  return {
    ...baseCookieOptions(0),
    httpOnly: true,
  };
}

export function csrfCookieClearOptions(): CookieOptions {
  return {
    ...baseCookieOptions(0),
    httpOnly: false,
  };
}
