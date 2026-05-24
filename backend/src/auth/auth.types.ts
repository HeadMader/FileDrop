import type { Request } from 'express';

export interface PublicUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: Date;
}

export interface AuthSessionContext {
  id: string;
  userId: string;
  csrfHash: string;
  expiresAt: Date;
}

export interface RequestWithAuth extends Request {
  authUser?: PublicUser;
  authSession?: AuthSessionContext;
  cookies: Record<string, unknown>;
}

export interface UserRecordLike {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: Date;
}

export function toPublicUser(user: UserRecordLike): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export interface SessionRequestMetadata {
  ip: string | null;
  userAgent: string | null;
}
