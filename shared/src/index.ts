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

export const ANON_MAX_FILE_SIZE = 50 * 1024 * 1024;
export const USER_MAX_FILE_SIZE = 500 * 1024 * 1024;

export const ANON_MAX_DOWNLOAD_LIMIT = 100;
export const USER_MAX_DOWNLOAD_LIMIT = 1000;

export interface PublicUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  createdAt: string;
}

export interface UploadItem {
  id: string;
  slug: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  downloadCount: number;
  downloadLimit: number | null;
  expiresAt: string;
  isExpired: boolean;
  hasPassword: boolean;
  createdAt: string;
}

export interface UploadResult {
  id: string;
  slug: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  shareUrl: string;
  expiresAt: string;
  downloadLimit: number | null;
  hasPassword: boolean;
  createdAt: string;
}

export interface DownloadLogEntry {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface UploadDetail extends UploadItem {
  checksum: string | null;
  downloads: DownloadLogEntry[];
}

export interface FileMetadata {
  slug: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  hasPassword: boolean;
  downloadCount: number;
  downloadLimit: number | null;
  expiresAt: string;
  isAvailable: boolean;
  createdAt: string;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface UserStats {
  totalUploads: number;
  activeUploads: number;
  expiredUploads: number;
  totalDownloads: number;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  downloadsPerDay: DailyCount[];
}

export interface SystemStats {
  totalFiles: number;
  activeFiles: number;
  expiredFiles: number;
  totalUsers: number;
  totalAdmins: number;
  totalAnonymousUploads: number;
  totalStorageBytes: number;
  totalDownloads: number;
  avgFileSizeBytes: number;
  uploadsToday: number;
  uploadsYesterday: number;
  downloadsToday: number;
  downloadsYesterday: number;
  uploadsPerDay: DailyCount[];
  downloadsPerDay: DailyCount[];
}

export interface SystemHealth {
  uptime: string;
  uptimeSeconds: number;
  uploadLatencyP95Ms: number;
  storageUsedBytes: number;
  storageTotalBytes: number;
  cleanupQueueSize: number;
  dbConnectionPoolSize: number;
  dbActiveConnections: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AdminUserItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  uploadCount: number;
  totalDownloads: number;
  storageUsedBytes: number;
  createdAt: string;
}

export interface AdminUploadItem extends UploadItem {
  uploaderEmail: string | null;
}

export interface AdminUploadDetail extends UploadDetail {
  uploaderEmail: string | null;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface SignupBody {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  token: string;
  password: string;
}

export interface UpdateUploadBody {
  fileName?: string;
  expiresIn?: ExpiresIn;
  downloadLimit?: number | null;
  password?: string;
  removePassword?: boolean;
}

export interface VerifyPasswordBody {
  password: string;
}

export interface VerifyPasswordResponse {
  valid: boolean;
  downloadToken?: string;
}

export type StatsPeriod = '7d' | '30d' | '90d';
