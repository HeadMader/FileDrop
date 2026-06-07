# Backend Technical Declaration — FileDrop

> **Purpose:** This document is a complete implementation specification for the backend of FileDrop — a file-sharing web service. It contains everything needed to build the backend from scratch. Follow it precisely.

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20+ |
| Framework | NestJS | 11.x |
| Language | TypeScript | 5.x |
| ORM | Prisma | 7.x (with `@prisma/adapter-pg`) |
| Database | PostgreSQL | 15+ |
| Object Storage | RustFS (S3-compatible) | via `@aws-sdk/client-s3` v3 |
| Package Manager | pnpm | latest |

---

## Project Setup

This is a **fresh project** — create it from scratch (`nest new filedrop-backend`, pnpm).

An **auth module** from a separate project is provided alongside this declaration as reference source code. Copy it into the new project as-is under `src/auth/`. Also copy `src/prisma.service.ts` and `src/prisma.module.ts`. These files are battle-tested and should be used without modification.

The auth module provides:
- `POST /api/auth/signup` — creates user, sets session cookie
- `POST /api/auth/login` — validates credentials, sets session cookie
- `GET /api/auth/me` — returns current user (requires `SessionAuthGuard`)
- `POST /api/auth/logout` — revokes session (requires `SessionAuthGuard` + `CsrfGuard`)
- `POST /api/auth/logout-all` — revokes all sessions for user
- Session tokens stored as SHA-256 hashes in `Session` table
- CSRF double-submit cookie pattern (cookie `csrf_token` + header `x-csrf-token`)
- `SessionAuthGuard` — reads `sid` cookie, finds active session, attaches `request.authUser` and `request.authSession`
- `CsrfGuard` — validates CSRF token match
- `RolesGuard` + `@Roles()` decorator — role-based access control
- `@CurrentUser()` decorator — extracts `PublicUser` from request
- `AdminBootstrapService` — creates admin from env vars on startup
- `PasswordService` — bcrypt hashing

**DO NOT modify or rewrite the auth module.** Build everything else on top of it. Import its guards and decorators.

### Prisma models from the auth module (copy as-is, do not modify)

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(USER)  // enum: USER, ADMIN
  firstName    String?
  lastName     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  sessions Session[]
  // ... add new relations here
}

model Session {
  id         String    @id @default(uuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash  String    @unique
  csrfHash   String
  ip         String?
  userAgent  String?
  expiresAt  DateTime
  revokedAt  DateTime?
  lastSeenAt DateTime
  createdAt  DateTime  @default(now())

  @@index([userId])
  @@index([expiresAt])
}

enum Role {
  USER
  ADMIN
}
```

### Types from the auth module (already defined in auth.types.ts)

```typescript
interface PublicUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: Date;
}

interface RequestWithAuth extends Request {
  authUser?: PublicUser;
  authSession?: AuthSessionContext;
  cookies: Record<string, unknown>;
}
```

---

## New Prisma Models

### Upload

```prisma
model Upload {
  id        String   @id @default(uuid())

  // Owner — null for anonymous uploads
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  // Anonymous fingerprint cookie value — for rate-limiting anonymous users
  anonToken String?

  // File metadata
  fileName      String
  mimeType      String?
  fileSize      Int                // bytes
  storageKey    String   @unique   // key in S3 bucket
  checksum      String?            // SHA-256 hex

  // Public share link
  slug          String   @unique   // 8-char nanoid (a-zA-Z0-9)

  // Access control
  passwordHash  String?            // bcrypt hash if password-protected
  downloadLimit Int?               // null = unlimited
  downloadCount Int      @default(0)

  // Lifecycle
  expiresAt     DateTime
  deletedAt     DateTime?          // soft delete

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  downloads DownloadLog[]

  @@index([userId])
  @@index([slug])
  @@index([anonToken])
  @@index([expiresAt])
}
```

### DownloadLog

```prisma
model DownloadLog {
  id       String @id @default(uuid())

  uploadId String
  upload   Upload @relation(fields: [uploadId], references: [id], onDelete: Cascade)

  ip        String?
  userAgent String?

  createdAt DateTime @default(now())

  @@index([uploadId])
  @@index([createdAt])
}
```

### Add to User model

```prisma
// Add these relations to the existing User model:
uploads            Upload[]
```

### PasswordResetToken

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  tokenHash String   @unique   // SHA-256 hash of the token sent via email
  expiresAt DateTime
  usedAt    DateTime?          // set when token is consumed

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}
```

### Add to User model

```prisma
// In addition to the uploads relation, also add:
passwordResetTokens PasswordResetToken[]
```

The Prisma schema should contain ONLY: `User`, `Session`, `Upload`, `DownloadLog`, `PasswordResetToken`, and the `Role` enum. No other models or enums.

---

## Module Architecture

```
src/
├── main.ts
├── app.module.ts
├── prisma.module.ts                 # COPIED FROM REFERENCE PROJECT
├── prisma.service.ts                # COPIED FROM REFERENCE PROJECT
│
├── auth/                            # COPIED FROM REFERENCE PROJECT — do not modify
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── session.service.ts
│   ├── session-auth.guard.ts
│   ├── csrf.guard.ts
│   ├── roles.guard.ts
│   ├── roles.decorator.ts
│   ├── current-user.decorator.ts
│   ├── password.service.ts
│   ├── csrf.service.ts
│   └── auth.types.ts
│
├── common/
│   └── guards/
│       └── optional-auth.guard.ts   # NEW — key guard for dual anon/auth endpoints
│
├── storage/                         # NEW — S3/RustFS abstraction
│   ├── storage.module.ts
│   └── storage.service.ts
│
├── uploads/                         # NEW — core file upload/download
│   ├── uploads.module.ts
│   ├── uploads.controller.ts
│   ├── uploads.service.ts
│   ├── download.controller.ts
│   ├── download.service.ts
│   ├── slug.service.ts
│   └── dto/
│       ├── create-upload.dto.ts
│       └── upload-settings.dto.ts
│
├── dashboard/                       # NEW — authenticated user's file management
│   ├── dashboard.module.ts
│   ├── dashboard.controller.ts
│   └── dashboard.service.ts
│
├── admin/                           # NEW — admin panel
│   ├── admin.module.ts
│   ├── admin.controller.ts
│   ├── admin.service.ts
│   └── admin-health.service.ts      # system health metrics
│
├── password-reset/                  # NEW — forgot/reset password flow
│   ├── password-reset.module.ts
│   ├── password-reset.controller.ts
│   ├── password-reset.service.ts
│   └── mail.service.ts              # sends reset emails
│
└── cleanup/                         # NEW — background cron job
    ├── cleanup.module.ts
    └── cleanup.service.ts
```

---

## New Guard: OptionalAuthGuard

```typescript
// common/guards/optional-auth.guard.ts
//
// Identical logic to SessionAuthGuard, but NEVER throws.
// If a valid session exists → attaches request.authUser and request.authSession.
// If no session or invalid → does nothing, request.authUser remains undefined.
// Always returns true.
//
// This is the key mechanism that lets one endpoint serve both
// anonymous and authenticated users.

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const sessionToken = request.cookies?.['sid'];

    if (typeof sessionToken !== 'string' || !sessionToken) {
      return true; // anonymous — proceed without user
    }

    try {
      const session = await this.sessionService.findActiveSessionByToken(sessionToken);
      if (session) {
        request.authUser = toPublicUser(session.user);
        request.authSession = {
          id: session.id,
          userId: session.userId,
          csrfHash: session.csrfHash,
          expiresAt: session.expiresAt,
        };
      }
    } catch {
      // invalid/expired session — treat as anonymous
    }

    return true;
  }
}
```

Export `OptionalAuthGuard` from `AuthModule`'s exports so other modules can inject it. Add it to the `providers` and `exports` arrays in `auth.module.ts` — this is the one small addition to the auth module.

---

## StorageService (S3/RustFS)

```typescript
// storage/storage.service.ts
//
// Wraps @aws-sdk/client-s3 configured for RustFS.
// All file operations go through this service — never access S3 directly elsewhere.

@Injectable()
export class StorageService {
  private client: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.client = new S3Client({
      endpoint: config.get('S3_ENDPOINT'),          // e.g. http://localhost:9000
      region: config.get('S3_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY'),
        secretAccessKey: config.get('S3_SECRET_KEY'),
      },
      forcePathStyle: true,  // required for RustFS/MinIO
    });
    this.bucket = config.get('S3_BUCKET') || 'filedrop';
  }

  // Upload a file stream/buffer to S3. Returns the storageKey.
  async upload(key: string, body: Buffer | Readable, contentType?: string): Promise<void>;

  // Get a readable stream for downloading.
  async download(key: string): Promise<Readable>;

  // Delete a file from S3.
  async delete(key: string): Promise<void>;

  // Check if a file exists.
  async exists(key: string): Promise<boolean>;
}
```

Use `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`, `HeadObjectCommand`.

**Storage key format:** `uploads/${uuid}/${sanitized-filename}` — the uuid is the Upload record id, guaranteeing uniqueness.

---

## SlugService

```typescript
// uploads/slug.service.ts

@Injectable()
export class SlugService {
  constructor(private prisma: PrismaService) {}

  // Generate a unique 8-character slug using nanoid with alphabet [a-zA-Z0-9].
  // If collision detected (unique constraint), retry with 10-char, then 12-char.
  // Max 5 retries before throwing.
  async generate(): Promise<string>;
}
```

Use `nanoid` package with custom alphabet `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`.

---

## API Specification

### Uploads — public endpoints (anonymous + authenticated)

#### `POST /api/uploads` — Upload a file

**Guard:** `OptionalAuthGuard`

**Request:** `multipart/form-data`

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `file` | File | yes | Max size depends on auth status |
| `expiresIn` | string | yes | One of: `"1h"`, `"6h"`, `"24h"`, `"3d"`, `"7d"`, `"14d"`, `"30d"` |
| `downloadLimit` | number \| null | no | `1`–`1000` for USER, `1`–`100` for anon. `null`/omitted = unlimited (USER only; anon must provide a limit) |
| `password` | string | no | 4–72 chars. Only USER. Ignored for anonymous. |

**Business rules:**

| Rule | Anonymous | Authenticated (USER/ADMIN) |
|------|----------|---------------------------|
| Max file size | 50 MB | 500 MB |
| Allowed `expiresIn` | `1h`, `6h`, `24h`, `3d`, `7d` | all values including `14d`, `30d` |
| Download limit | required, `1`–`100` | optional, `1`–`1000` or unlimited |
| Password protection | not available | optional |
| Max active uploads | 10 (by `anonToken`) | 100 (by `userId`) |

**Anonymous tracking:** Read `anon_token` cookie from request. If absent, generate a UUID and set it as a cookie (`anon_token`, httpOnly, sameSite=lax, maxAge=30 days). Store in `Upload.anonToken`. Use for rate limiting and active upload counting.

**Processing steps:**
1. Validate auth status and apply appropriate limits
2. Check active upload count; reject with `429` if exceeded
3. Generate slug via `SlugService`
4. Compute SHA-256 checksum of the file buffer
5. Upload to S3 via `StorageService`
6. Hash password if provided (reuse `PasswordService`)
7. Create `Upload` record in database
8. Return response

**Response `201`:**
```json
{
  "id": "uuid",
  "slug": "aB3kX9mZ",
  "fileName": "report.pdf",
  "fileSize": 2097152,
  "mimeType": "application/pdf",
  "shareUrl": "/s/aB3kX9mZ",
  "expiresAt": "2026-06-01T12:00:00.000Z",
  "downloadLimit": 5,
  "hasPassword": false,
  "createdAt": "2026-05-25T12:00:00.000Z"
}
```

**Errors:**
- `400` — validation failure (bad expiresIn, file missing, etc.)
- `413` — file too large
- `429` — active upload limit reached or rate limit

---

#### `GET /api/uploads/:slug` — File metadata

**Guard:** none

**Response `200`:**
```json
{
  "slug": "aB3kX9mZ",
  "fileName": "report.pdf",
  "fileSize": 2097152,
  "mimeType": "application/pdf",
  "hasPassword": true,
  "downloadCount": 3,
  "downloadLimit": 5,
  "expiresAt": "2026-06-01T12:00:00.000Z",
  "isAvailable": true,
  "createdAt": "2026-05-25T12:00:00.000Z"
}
```

`isAvailable` is `false` when the file is expired, deleted, or download limit reached.

**Errors:**
- `404` — slug not found or `deletedAt` is set
- `410` — expired or download limit reached (return body with `isAvailable: false` and reason)

---

#### `POST /api/uploads/:slug/verify-password` — Check password

**Guard:** none

**Request:**
```json
{ "password": "user-entered-password" }
```

**Response `200`:**
```json
{ "valid": true, "downloadToken": "<jwt-token>" }
```

The `downloadToken` is a short-lived JWT (30 min) containing `{ slug, purpose: "download" }`. Sign it with a dedicated secret (`DOWNLOAD_TOKEN_SECRET` env var). The download endpoint accepts this token as a `?token=` query parameter.

**Response `403`:**
```json
{ "valid": false }
```

**Rate limit:** 5 attempts per 15 minutes per IP per slug.

---

#### `GET /api/uploads/:slug/download` — Download file

**Guard:** none

**Query parameters:**
- `token` (optional) — JWT from password verification

**Processing steps:**
1. Find upload by slug; reject if not found / deleted / expired / limit reached
2. If `passwordHash` is set and no valid `token` query param → `403`
3. Validate JWT token if provided (check slug match, expiry)
4. Atomically increment `downloadCount` (`UPDATE uploads SET download_count = download_count + 1 WHERE id = $1 AND (download_limit IS NULL OR download_count < download_limit) RETURNING *`) — if 0 rows affected, the limit was just reached → `410`
5. Create `DownloadLog` record
6. Stream file from S3 via `StorageService`
7. Set headers:
   - `Content-Type`: from `mimeType` or `application/octet-stream`
   - `Content-Disposition: attachment; filename="<fileName>"` — always `attachment`, never `inline`
   - `Content-Length`: from `fileSize`
   - `Cache-Control: no-store`

**Errors:**
- `403` — password required
- `404` — not found
- `410` — expired or download limit reached

---

### Dashboard — authenticated user endpoints

All endpoints require `SessionAuthGuard`. Mutating endpoints also require `CsrfGuard`.

#### `GET /api/dashboard/uploads` — List user's files

**Query parameters:**

| Param | Type | Default | Options |
|-------|------|---------|---------|
| `page` | number | `1` | ≥1 |
| `limit` | number | `20` | 1–50 |
| `sort` | string | `"newest"` | `newest`, `oldest`, `largest`, `most_downloaded` |
| `status` | string | `"all"` | `active`, `expired`, `all` |
| `search` | string | — | Filters by fileName (case-insensitive contains) |

**Response `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "slug": "aB3kX9mZ",
      "fileName": "report.pdf",
      "fileSize": 2097152,
      "mimeType": "application/pdf",
      "downloadCount": 3,
      "downloadLimit": 5,
      "expiresAt": "2026-06-01T12:00:00.000Z",
      "isExpired": false,
      "hasPassword": true,
      "createdAt": "2026-05-25T12:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "totalPages": 3
}
```

**Filtering logic:**
- `active`: `deletedAt IS NULL AND expiresAt > now() AND (downloadLimit IS NULL OR downloadCount < downloadLimit)`
- `expired`: NOT active (expired OR limit reached), but `deletedAt IS NULL`
- `all`: `deletedAt IS NULL`

Always filter by `userId = currentUser.id`.

---

#### `GET /api/dashboard/uploads/:id` — File detail with download log

**Response `200`:**
```json
{
  "id": "uuid",
  "slug": "aB3kX9mZ",
  "fileName": "report.pdf",
  "fileSize": 2097152,
  "mimeType": "application/pdf",
  "checksum": "sha256hex...",
  "downloadCount": 3,
  "downloadLimit": 5,
  "expiresAt": "2026-06-01T12:00:00.000Z",
  "hasPassword": true,
  "isExpired": false,
  "createdAt": "2026-05-25T12:00:00.000Z",
  "downloads": [
    {
      "id": "uuid",
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-05-26T08:30:00.000Z"
    }
  ]
}
```

Must verify `upload.userId === currentUser.id`, otherwise `404`.

---

#### `PATCH /api/dashboard/uploads/:id` — Update file settings

**Guard:** `SessionAuthGuard` + `CsrfGuard`

**Request body (all fields optional):**
```json
{
  "fileName": "new-name.pdf",
  "expiresIn": "30d",
  "downloadLimit": 100,
  "password": "new-password",
  "removePassword": true
}
```

**Rules:**
- `expiresIn` — recalculates `expiresAt` from **now** (not from original upload time)
- `downloadLimit` — must be ≥ current `downloadCount` (can't set below already-used)
- `password` and `removePassword` are mutually exclusive
- Cannot update a deleted or expired upload → `409`
- Must verify ownership (`upload.userId === currentUser.id`) → `404`

**Response `200`:** updated upload object (same shape as list item)

---

#### `DELETE /api/dashboard/uploads/:id` — Delete file

**Guard:** `SessionAuthGuard` + `CsrfGuard`

**Processing:**
1. Verify ownership
2. Delete file from S3 via `StorageService`
3. Set `deletedAt = now()` (soft delete)

**Response `200`:**
```json
{ "success": true }
```

---

#### `GET /api/dashboard/stats` — User statistics

**Query parameters:**

| Param | Type | Default | Options |
|-------|------|---------|---------|
| `period` | string | `"7d"` | `7d`, `30d`, `90d` |

**Response `200`:**
```json
{
  "totalUploads": 42,
  "activeUploads": 15,
  "expiredUploads": 27,
  "totalDownloads": 1337,
  "storageUsedBytes": 536870912,
  "storageQuotaBytes": 10737418240,
  "downloadsPerDay": [
    { "date": "2026-05-18", "count": 23 },
    { "date": "2026-05-19", "count": 45 },
    { "date": "2026-05-20", "count": 12 },
    { "date": "2026-05-21", "count": 67 },
    { "date": "2026-05-22", "count": 34 },
    { "date": "2026-05-23", "count": 89 },
    { "date": "2026-05-24", "count": 56 }
  ]
}
```

`storageQuotaBytes` — per-user storage quota. Read from env `USER_STORAGE_QUOTA_GB` (default: 10). Value in bytes.

`downloadsPerDay` — length depends on `period` param: 7, 30, or 90 entries. Computed from `DownloadLog` joined with user's uploads.

---

### Admin — administrator endpoints

All endpoints require `SessionAuthGuard` + `RolesGuard` with `@Roles('ADMIN')`. Mutating endpoints also require `CsrfGuard`.

#### `GET /api/admin/stats` — System statistics

**Response `200`:**
```json
{
  "totalFiles": 1500,
  "activeFiles": 800,
  "expiredFiles": 700,
  "totalUsers": 120,
  "totalAdmins": 3,
  "totalAnonymousUploads": 950,
  "totalStorageBytes": 10737418240,
  "totalDownloads": 25000,
  "avgFileSizeBytes": 7158278,
  "uploadsToday": 45,
  "uploadsYesterday": 38,
  "downloadsToday": 312,
  "downloadsYesterday": 294,
  "uploadsPerDay": [
    { "date": "2026-04-25", "count": 30 }
  ],
  "downloadsPerDay": [
    { "date": "2026-04-25", "count": 200 }
  ]
}
```

`uploadsPerDay` and `downloadsPerDay` — last 30 days.

`avgFileSizeBytes` — average `fileSize` across all non-deleted uploads in the trailing 30 days.

`uploadsYesterday` / `downloadsYesterday` — used by the frontend to compute "% vs yesterday" badges.

---

#### `GET /api/admin/health` — System health

**Guard:** `SessionAuthGuard` + `Roles(ADMIN)`

**Response `200`:**
```json
{
  "uptime": "99.98%",
  "uptimeSeconds": 1728000,
  "uploadLatencyP95Ms": 182,
  "storageUsedBytes": 10737418240,
  "storageTotalBytes": 10995116277760,
  "cleanupQueueSize": 12,
  "dbConnectionPoolSize": 10,
  "dbActiveConnections": 3
}
```

**Implementation:**
- `uptimeSeconds` — `process.uptime()`
- `uptime` — computed as percentage: time since last restart / total expected uptime (or just "99.9%" placeholder for coursework)
- `uploadLatencyP95Ms` — placeholder value (real implementation would use metrics collection)
- `storageUsedBytes` / `storageTotalBytes` — sum of all `Upload.fileSize` for used; `storageTotalBytes` from env `STORAGE_TOTAL_BYTES`
- `cleanupQueueSize` — count of uploads with `expiresAt < now() AND deletedAt IS NULL` (pending cleanup)
- `dbConnectionPoolSize` / `dbActiveConnections` — from pg Pool stats if available, otherwise placeholder

---

#### `GET /api/admin/export` — Export data as CSV

**Guard:** `SessionAuthGuard` + `Roles(ADMIN)`

**Query parameters:**

| Param | Type | Required | Options |
|-------|------|----------|---------|
| `type` | string | yes | `uploads`, `users` |

**Response:** `Content-Type: text/csv` with `Content-Disposition: attachment; filename="filedrop-uploads-2026-05-24.csv"`

**CSV columns for `uploads`:**
`id, slug, fileName, fileSize, mimeType, uploaderEmail, downloadCount, downloadLimit, hasPassword, expiresAt, isExpired, createdAt`

**CSV columns for `users`:**
`id, email, firstName, lastName, role, uploadCount, totalDownloads, storageUsedBytes, createdAt`

Export all records (no pagination). For large datasets, stream the CSV response row by row.

---

#### `GET /api/admin/uploads` — All files in system

Same query params as dashboard list, plus:
- `userId` (optional) — filter by specific user
- `anonymous` (optional, boolean) — filter anonymous-only uploads

Response shape identical to dashboard list, but includes an additional `uploaderEmail` field (null for anonymous).

---

#### `DELETE /api/admin/uploads/:id` — Force-delete any file

**Guard:** `SessionAuthGuard` + `Roles(ADMIN)` + `CsrfGuard`

Same logic as dashboard delete but without ownership check.

---

#### `GET /api/admin/users` — User list

**Query params:** `page`, `limit`, `search` (email/name), `sort` (`newest`, `most_uploads`, `most_storage`)

**Response `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "USER",
      "uploadCount": 15,
      "totalDownloads": 230,
      "storageUsedBytes": 104857600,
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  ],
  "total": 120,
  "page": 1,
  "totalPages": 6
}
```

Upload count, download count, and storage are computed via aggregation queries.

---

### Password Reset — public endpoints

These are in a **separate module** (`password-reset/`), not inside the existing auth module.

#### `POST /api/auth/forgot-password` — Request password reset

**Guard:** none

**Request:**
```json
{ "email": "user@example.com" }
```

**Response `200`** (always — do not reveal whether the email exists):
```json
{ "message": "If an account exists with that email, a reset link has been sent." }
```

**Processing:**
1. Look up user by email. If not found, return 200 anyway (prevent enumeration).
2. Invalidate any existing unused `PasswordResetToken` for this user (set `usedAt = now()`).
3. Generate a random 32-byte token (`crypto.randomBytes(32).toString('base64url')`).
4. Store `SHA-256(token)` in `PasswordResetToken` with `expiresAt = now + 1 hour`.
5. Send email with link: `${FRONTEND_URL}/reset-password?token=<raw-token>`.
6. Use `MailService` to send — in development, log the link to console instead of sending.

**Rate limit:** 3 per 15 min per IP.

---

#### `POST /api/auth/reset-password` — Set new password with token

**Guard:** none

**Request:**
```json
{
  "token": "raw-token-from-email-link",
  "password": "new-password-8-to-72-chars"
}
```

**Response `200`:**
```json
{ "message": "Password has been reset. You can now log in." }
```

**Processing:**
1. Hash the provided token with SHA-256.
2. Find `PasswordResetToken` by `tokenHash` where `expiresAt > now()` and `usedAt IS NULL`.
3. If not found → `400 "Invalid or expired reset token"`.
4. Validate password (8–72 chars).
5. Hash new password with `PasswordService`.
6. Update `User.passwordHash`.
7. Set `PasswordResetToken.usedAt = now()`.
8. Revoke all existing sessions for the user (call `SessionService.revokeAllSessionsForUser`).

**Rate limit:** 5 per 15 min per IP.

---

### MailService

```typescript
// password-reset/mail.service.ts
//
// In development (NODE_ENV !== 'production'): log reset link to console.
// In production: use nodemailer with SMTP credentials from env.

@Injectable()
export class MailService {
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>;
}
```

---

## CleanupService — Background Cron

```typescript
// cleanup/cleanup.service.ts
//
// Uses @nestjs/schedule (CronExpression) — add @nestjs/schedule to dependencies.

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  // Every 15 minutes: soft-delete expired or limit-reached uploads
  @Cron('*/15 * * * *')
  async softDeleteExpired(): Promise<void> {
    // Find uploads where:
    //   deletedAt IS NULL
    //   AND (expiresAt <= now() OR (downloadLimit IS NOT NULL AND downloadCount >= downloadLimit))
    // For each: set deletedAt = now()
    // Log count.
  }

  // Every hour: hard-delete S3 files for soft-deleted uploads older than 1 hour
  @Cron('0 * * * *')
  async cleanupStorage(): Promise<void> {
    // Find uploads where deletedAt IS NOT NULL AND deletedAt < now() - 1 hour
    // For each: delete from S3, then delete DB record permanently
    // Log count.
  }
}
```

---

## Rate Limiting

Use `@nestjs/throttler`.

| Endpoint | Anonymous | Authenticated |
|----------|----------|---------------|
| `POST /api/uploads` | 5 / 15 min | 30 / 15 min |
| `GET /api/uploads/:slug/download` | 30 / 15 min | 100 / 15 min |
| `POST /api/uploads/:slug/verify-password` | 5 / 15 min per slug | 5 / 15 min per slug |
| `POST /api/auth/login` | 5 / 15 min | — |
| `POST /api/auth/signup` | 3 / 15 min | — |
| `POST /api/auth/forgot-password` | 3 / 15 min | — |
| `POST /api/auth/reset-password` | 5 / 15 min | — |

Rate limit by IP for anonymous, by userId for authenticated.

---

## Environment Variables

```env
# Auth module
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SESSION_TTL_DAYS=14
COOKIE_SECURE=false
COOKIE_DOMAIN=
BCRYPT_ROUNDS=12
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_FIRSTNAME=
ADMIN_LASTNAME=
NODE_ENV=development
PORT=3000

# New — S3/RustFS
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=filedrop
S3_REGION=us-east-1

# New — Download token
DOWNLOAD_TOKEN_SECRET=change-me-in-production

# New — Upload limits (override defaults)
MAX_FILE_SIZE_ANON_MB=50
MAX_FILE_SIZE_USER_MB=500
USER_STORAGE_QUOTA_GB=10

# New — System storage (for admin health endpoint)
STORAGE_TOTAL_BYTES=10995116277760

# New — Frontend URL (for password reset emails and CORS)
FRONTEND_URL=http://localhost:5173

# New — SMTP (password reset emails; optional in dev — logs to console)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@filedrop.dev
```

---

## Dependencies to Add

**Auth module requires (install these first):**
```
@nestjs/config
@prisma/adapter-pg
@prisma/client
prisma (devDependency)
bcrypt
@types/bcrypt (devDependency)
cookie-parser
@types/cookie-parser (devDependency)
pg
@types/pg (devDependency)
dotenv
```

**New modules require:**
```
@aws-sdk/client-s3
@nestjs/schedule
@nestjs/throttler
nanoid
@nestjs/jwt
nodemailer
@types/nodemailer (devDependency)
```

---

## CORS

Configure CORS in `main.ts`:
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});
```

---

## Security Rules (non-negotiable)

1. **Always `Content-Disposition: attachment`** — never serve files inline to prevent XSS via HTML/SVG uploads.
2. **Sanitize `fileName`** — strip path separators, HTML tags, control characters. Limit to 255 chars.
3. **Storage keys are server-generated** (UUID-based) — never derived from user input.
4. **Password verification** is rate-limited and uses bcrypt (constant-time comparison).
5. **Download count increment is atomic** — use a single UPDATE with a WHERE clause to prevent race conditions.
6. **Ownership checks** — dashboard endpoints always filter by `userId`; never trust client-provided userId.
7. **File streaming** — pipe S3 stream directly to response; never buffer entire files in memory.

---

## Testing Notes

- Unit tests for `SlugService`, `CleanupService`, `UploadsService` business logic
- Use `jest-mock-extended` for Prisma mocking (already in devDependencies)
- Test both anonymous and authenticated upload paths
- Test download limit atomic increment edge case (concurrent requests)
