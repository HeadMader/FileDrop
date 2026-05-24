// Shared types and contracts between backend and frontend.
// Keep this package framework-agnostic — only plain TypeScript.

export type Role = 'USER' | 'ADMIN';

export type ExpiresIn = '1h' | '6h' | '24h' | '3d' | '7d' | '14d' | '30d';

export const ANON_EXPIRES_IN: readonly ExpiresIn[] = [
  '1h',
  '6h',
  '24h',
  '3d',
  '7d',
] as const;

export const USER_EXPIRES_IN: readonly ExpiresIn[] = [
  '1h',
  '6h',
  '24h',
  '3d',
  '7d',
  '14d',
  '30d',
] as const;

export interface PublicUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  createdAt: string;
}
