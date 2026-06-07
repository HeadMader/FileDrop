import type { ExpiresIn } from '@filedrop/shared';

export const EXPIRATION_OPTIONS: { value: ExpiresIn; label: string; ms: number }[] = [
  { value: '1h', label: '1 hour', ms: 3_600_000 },
  { value: '6h', label: '6 hours', ms: 21_600_000 },
  { value: '24h', label: '24 hours', ms: 86_400_000 },
  { value: '3d', label: '3 days', ms: 259_200_000 },
  { value: '7d', label: '7 days', ms: 604_800_000 },
  { value: '14d', label: '14 days', ms: 86_400_000 * 14 },
  { value: '30d', label: '30 days', ms: 86_400_000 * 30 },
];

export const RECENT_UPLOADS_STORAGE_KEY = 'filedrop_recent';
export const RECENT_UPLOADS_MAX = 10;
