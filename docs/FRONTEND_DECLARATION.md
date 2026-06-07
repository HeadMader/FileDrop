# Frontend Technical Declaration — FileDrop

> **Purpose:** This document is a complete functional specification for the frontend of FileDrop — a file-sharing web service. It describes every page, component, store, and user flow. It contains NO design instructions — visual design is provided separately. Follow this specification precisely for functionality, data flow, and component structure.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 (Composition API, `<script setup>` syntax) |
| State Management | Pinia |
| Routing | Vue Router 4 |
| CSS | Tailwind CSS |
| HTTP | Native `fetch` API (wrapper) |
| Build | Vite |
| Language | TypeScript |

---

## What This App Does

FileDrop lets anyone share files via unique links. Users upload a file, get a short link, and send it to recipients who can download from that link. The service supports two user types:

**Anonymous users** — no account needed. Upload files up to 50 MB with a maximum 7-day expiration and a required download limit (1–100). No dashboard, no history on the server. Recent uploads are tracked in localStorage for convenience.

**Authenticated users** — optional registration gives: 500 MB file size limit, 30-day expiration, unlimited downloads option, password-protected files, a dashboard with file management, and download statistics.

**Admins** — system-wide statistics, file moderation, user management.

---

## Backend API Contract

The frontend consumes these endpoints. Base URL: `/api`.

### Auth

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/auth/signup` | — | Create account. Body: `{ email, password, firstName?, lastName? }`. Returns `{ user }`. Sets session cookies. |
| `POST` | `/auth/login` | — | Log in. Body: `{ email, password }`. Returns `{ user }`. Sets session cookies. |
| `GET` | `/auth/me` | session | Current user. Returns `{ user }` or `401`. |
| `POST` | `/auth/logout` | session+csrf | Log out current session. |
| `POST` | `/auth/logout-all` | session+csrf | Log out all sessions. |
| `POST` | `/auth/forgot-password` | — | Request reset email. Body: `{ email }`. Always returns `{ message }` (no email enumeration). |
| `POST` | `/auth/reset-password` | — | Set new password. Body: `{ token, password }`. Returns `{ message }` or `400`. |

### Uploads (public)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/uploads` | optional | Upload file. `multipart/form-data` with fields: `file`, `expiresIn`, `downloadLimit?`, `password?`. |
| `GET` | `/uploads/:slug` | — | File metadata (name, size, hasPassword, downloadCount, downloadLimit, expiresAt, isAvailable). |
| `POST` | `/uploads/:slug/verify-password` | — | Check password. Body: `{ password }`. Returns `{ valid, downloadToken? }`. |
| `GET` | `/uploads/:slug/download?token=` | — | Download file (binary stream). |

### Dashboard (authenticated)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/dashboard/uploads` | session | User's files. Query: `page`, `limit`, `sort`, `status`, `search`. Returns paginated list. |
| `GET` | `/dashboard/uploads/:id` | session | File detail + download log array. |
| `PATCH` | `/dashboard/uploads/:id` | session+csrf | Update file (fileName, expiresIn, downloadLimit, password, removePassword). |
| `DELETE` | `/dashboard/uploads/:id` | session+csrf | Delete file. |
| `GET` | `/dashboard/stats` | session | User stats. Query: `period` (`7d`/`30d`/`90d`, default `7d`). Returns totals + downloadsPerDay array. |

### Admin

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/admin/stats` | admin | System stats: totals + yesterday comparisons + 30-day charts. |
| `GET` | `/admin/health` | admin | System health: uptime, latency, storage capacity, queue size. |
| `GET` | `/admin/export?type=uploads\|users` | admin | CSV export of all uploads or users. Returns `text/csv` file download. |
| `GET` | `/admin/uploads` | admin | All files. Same params as dashboard + `userId`, `anonymous`. Includes `uploaderEmail`. |
| `DELETE` | `/admin/uploads/:id` | admin+csrf | Force-delete file. |
| `GET` | `/admin/users` | admin | User list with aggregate stats. Query: `page`, `limit`, `search`, `sort`. |

### CSRF Pattern

Every mutating request (`POST`, `PATCH`, `DELETE` to non-auth-login endpoints) must include header `x-csrf-token` with the value read from the `csrf_token` cookie. The API client must handle this automatically.

### Response Shapes

```typescript
// User
interface PublicUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

// Upload (list item)
interface UploadItem {
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

// Upload (created)
interface UploadResult {
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

// Upload (detail — dashboard)
interface UploadDetail extends UploadItem {
  checksum: string | null;
  downloads: DownloadLogEntry[];
}

interface DownloadLogEntry {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

// File metadata (public download page)
interface FileMetadata {
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

// Stats (dashboard)
interface UserStats {
  totalUploads: number;
  activeUploads: number;
  expiredUploads: number;
  totalDownloads: number;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  downloadsPerDay: { date: string; count: number }[];
}

// Stats (admin)
interface SystemStats {
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
  uploadsPerDay: { date: string; count: number }[];
  downloadsPerDay: { date: string; count: number }[];
}

// System health (admin)
interface SystemHealth {
  uptime: string;
  uptimeSeconds: number;
  uploadLatencyP95Ms: number;
  storageUsedBytes: number;
  storageTotalBytes: number;
  cleanupQueueSize: number;
  dbConnectionPoolSize: number;
  dbActiveConnections: number;
}

// Paginated response wrapper
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Admin user item
interface AdminUserItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  uploadCount: number;
  totalDownloads: number;
  storageUsedBytes: number;
  createdAt: string;
}
```

---

## Project Structure

```
src/
├── main.ts
├── App.vue
├── router/
│   └── index.ts
├── stores/
│   ├── auth.store.ts
│   ├── upload.store.ts
│   ├── dashboard.store.ts
│   └── admin.store.ts
├── api/
│   ├── client.ts              # fetch wrapper with CSRF
│   ├── auth.api.ts
│   ├── uploads.api.ts
│   ├── dashboard.api.ts
│   └── admin.api.ts
├── composables/
│   ├── useUpload.ts
│   ├── useCountdown.ts
│   ├── useClipboard.ts
│   └── useFileSize.ts
├── views/
│   ├── HomePage.vue
│   ├── DownloadPage.vue
│   ├── DashboardPage.vue
│   ├── DashboardFilePage.vue
│   ├── AdminPage.vue
│   ├── LoginPage.vue
│   ├── SignupPage.vue
│   ├── ForgotPasswordPage.vue
│   ├── ResetPasswordPage.vue
│   └── NotFoundPage.vue
├── components/
│   ├── upload/
│   │   ├── DropZone.vue
│   │   ├── UploadForm.vue
│   │   ├── UploadProgress.vue
│   │   └── ShareResult.vue
│   ├── download/
│   │   ├── FileInfo.vue
│   │   ├── PasswordPrompt.vue
│   │   └── DownloadButton.vue
│   ├── dashboard/
│   │   ├── FileList.vue
│   │   ├── FileCard.vue
│   │   ├── StatsOverview.vue
│   │   ├── DownloadChart.vue
│   │   └── EditFileModal.vue
│   ├── admin/
│   │   ├── SystemStats.vue
│   │   ├── SystemHealth.vue
│   │   ├── AdminFileList.vue
│   │   └── AdminUserList.vue
│   └── shared/
│       ├── AppHeader.vue
│       ├── AppFooter.vue
│       ├── Pagination.vue
│       ├── ConfirmDialog.vue
│       ├── Toast.vue
│       └── LoadingSpinner.vue
├── types/
│   └── index.ts               # all TypeScript interfaces above
└── utils/
    ├── formatBytes.ts
    ├── formatDate.ts
    └── constants.ts
```

---

## Routing

| Path | View | Navigation Guard | Description |
|------|------|-------------------|-------------|
| `/` | `HomePage` | — | Main upload page |
| `/s/:slug` | `DownloadPage` | — | Public file download page |
| `/dashboard` | `DashboardPage` | `requireAuth` | User's file management |
| `/dashboard/files/:id` | `DashboardFilePage` | `requireAuth` | Single file detail |
| `/admin` | `AdminPage` | `requireAdmin` | Admin panel |
| `/login` | `LoginPage` | `guestOnly` | Login form |
| `/signup` | `SignupPage` | `guestOnly` | Registration form |
| `/forgot-password` | `ForgotPasswordPage` | `guestOnly` | Request password reset email |
| `/reset-password` | `ResetPasswordPage` | `guestOnly` | Set new password (requires `?token=` query param) |
| `/:pathMatch(.*)*` | `NotFoundPage` | — | 404 page |

### Navigation Guards

- **`requireAuth`** — if `authStore.isAuthenticated` is false → redirect to `/login` with `redirect` query param preserving original destination
- **`requireAdmin`** — if `authStore.isAdmin` is false → redirect to `/`
- **`guestOnly`** — if `authStore.isAuthenticated` is true → redirect to `/dashboard`

Guards must wait for `authStore.init()` to complete before evaluating (the store fetches `/auth/me` on app startup).

---

## Pinia Stores — Detailed Specification

### auth.store.ts

```
State:
  user: PublicUser | null         — current authenticated user
  isLoading: boolean              — true during init/login/signup
  isInitialized: boolean          — true after first /auth/me attempt completes
  error: string | null            — last auth error message

Getters:
  isAuthenticated: boolean        — user !== null
  isAdmin: boolean                — user?.role === 'ADMIN'
  displayName: string             — firstName || email prefix

Actions:
  async init()
    Called once on app mount (App.vue onMounted).
    GET /auth/me → on success set user; on 401 set user = null.
    Set isInitialized = true regardless.

  async login(email: string, password: string)
    POST /auth/login → set user from response.
    Throws on failure (component handles error display).

  async signup(email: string, password: string, firstName?: string, lastName?: string)
    POST /auth/signup → set user from response.

  async logout()
    POST /auth/logout → set user = null.
    Router push to /.

  async logoutAll()
    POST /auth/logout-all → set user = null.
    Router push to /.

  async forgotPassword(email: string)
    POST /auth/forgot-password → returns message.
    Does NOT throw on success (always succeeds to prevent email enumeration).

  async resetPassword(token: string, password: string)
    POST /auth/reset-password → returns message.
    On success: router push to /login with success toast.
    On failure: throw (component shows error).
```

### upload.store.ts

```
State:
  file: File | null               — selected file
  options: {
    expiresIn: string             — default '24h'
    downloadLimit: number | null  — default null (or 5 for anon)
    password: string              — default ''
  }
  progress: number                — 0 to 100
  status: 'idle' | 'uploading' | 'done' | 'error'
  result: UploadResult | null
  error: string | null

Getters:
  canUpload: boolean              — file !== null && status !== 'uploading'
  shareUrl: string | null         — result ? window.location.origin + result.shareUrl : null

Actions:
  setFile(file: File)
    Set file, reset status to idle, clear result and error.

  async upload()
    Validate file and options.
    Use useUpload composable internally (or call directly).
    POST /uploads with multipart/form-data.
    Track progress via XMLHttpRequest upload.onprogress.
    On success: set result, set status = 'done', save to recentUploads in localStorage.
    On error: set error message, set status = 'error'.

  reset()
    Clear all state back to initial.

  getRecentUploads(): UploadResult[]
    Read from localStorage key 'filedrop_recent'.
    Return last 10, filtered to remove expired ones (check expiresAt).

  saveToRecent(result: UploadResult)
    Push to localStorage 'filedrop_recent' array (max 10, LIFO).
```

### dashboard.store.ts

```
State:
  files: UploadItem[]
  selectedFile: UploadDetail | null
  stats: UserStats | null
  statsPeriod: '7d' | '30d' | '90d'  — default '7d'
  pagination: { page: number; totalPages: number; total: number }
  filters: { sort: string; status: string; search: string }
  isLoading: boolean
  error: string | null

Actions:
  async fetchFiles(page?: number)
    GET /dashboard/uploads with current filters and page.
    Update files, pagination.

  async fetchStats(period?: '7d' | '30d' | '90d')
    GET /dashboard/stats?period=<period>.
    Update statsPeriod if provided.

  async fetchFileDetail(id: string)
    GET /dashboard/uploads/:id.
    Set selectedFile.

  async updateFile(id: string, updates: Partial<...>)
    PATCH /dashboard/uploads/:id.
    Refresh the file in the list.

  async deleteFile(id: string)
    DELETE /dashboard/uploads/:id.
    Remove from files array. Refresh stats.

  setFilters(filters: Partial<typeof filters>)
    Update filters, reset page to 1, call fetchFiles().
```

### admin.store.ts

```
State:
  stats: SystemStats | null
  health: SystemHealth | null
  files: (UploadItem & { uploaderEmail: string | null })[]
  users: AdminUserItem[]
  filePagination: { page; totalPages; total }
  userPagination: { page; totalPages; total }
  fileFilters: { sort; status; search; userId?; anonymous? }
  userFilters: { sort; search }
  isLoading: boolean

Actions:
  async fetchStats()
  async fetchHealth()
  async fetchFiles(page?: number)
  async deleteFile(id: string)
  async fetchUsers(page?: number)
  async exportCsv(type: 'uploads' | 'users')
    GET /admin/export?type=<type>
    Receives blob → creates temporary <a> element with download attribute
    Triggers browser download of CSV file
```

---

## API Client — `api/client.ts`

```typescript
// Thin wrapper over fetch.
//
// Responsibilities:
// 1. Prepend '/api' base path
// 2. JSON serialization/deserialization for non-multipart requests
// 3. Read 'csrf_token' cookie and attach as 'x-csrf-token' header on mutating requests
// 4. Credentials: 'include' on all requests (for cookies)
// 5. Centralized error handling:
//    - 401 → clear auth store, redirect to /login (except for /auth/me)
//    - 429 → extract retry-after, throw typed error
//    - 4xx/5xx → throw with message from response body
//
// Exports:
//   get<T>(path, params?): Promise<T>
//   post<T>(path, body?): Promise<T>
//   patch<T>(path, body?): Promise<T>
//   del<T>(path): Promise<T>
//   uploadFile(path, formData, onProgress): Promise<T>
//     — uses XMLHttpRequest for upload progress tracking
//     — returns Promise that resolves with parsed JSON response

function getCsrfToken(): string | null {
  // Parse document.cookie to find 'csrf_token' value
}
```

### Per-domain API modules

Each API module is a plain object with typed async functions:

```
auth.api.ts     → login(), signup(), me(), logout(), logoutAll(), forgotPassword(), resetPassword()
uploads.api.ts  → upload(), getMetadata(), verifyPassword(), getDownloadUrl()
dashboard.api.ts → listFiles(), getFile(), updateFile(), deleteFile(), getStats(period?)
admin.api.ts    → getStats(), getHealth(), listFiles(), deleteFile(), listUsers(), exportCsv(type)
```

---

## Composables — Detailed Specification

### useUpload()

```
Arguments:
  — none (reads from upload store or accepts params)

Returns:
  progress: Ref<number>           — 0–100, updated via XMLHttpRequest progress event
  status: Ref<'idle' | 'uploading' | 'done' | 'error'>
  result: Ref<UploadResult | null>
  error: Ref<string | null>
  upload(file: File, options): Promise<void>
  cancel(): void

Implementation:
  Uses XMLHttpRequest (not fetch) because fetch does not support upload progress.
  Creates FormData with file and option fields.
  Sets up xhr.upload.onprogress for progress tracking.
  Uses AbortController-equivalent (xhr.abort()) for cancellation.
  Reads CSRF token from cookie and sets x-csrf-token header.
  Parses JSON response on completion.
```

### useCountdown(expiresAt: Ref<string> | string)

```
Returns:
  remaining: Ref<string>          — formatted: "2d 5h 30m", "45m 12s", "expired"
  isExpired: Ref<boolean>
  percentage: Ref<number>         — 0 to 100 (time remaining / total TTL)

Implementation:
  setInterval every second.
  Compute diff between now and expiresAt.
  Format with largest two units (days+hours, hours+minutes, minutes+seconds).
  Auto cleanup in onUnmounted.
```

### useClipboard()

```
Returns:
  copy(text: string): Promise<boolean>
  copied: Ref<boolean>           — true for 2 seconds after successful copy

Implementation:
  Uses navigator.clipboard.writeText().
  Fallback: create temporary textarea, select, execCommand('copy').
  Sets copied = true, setTimeout to false after 2000ms.
```

### useFileSize()

```
Returns:
  format(bytes: number): string

Output examples:
  1024       → "1 KB"
  1048576    → "1 MB"
  1073741824 → "1 GB"
  500        → "500 B"

Use binary units (1024-based).
```

---

## Pages — Functional Specification

### HomePage

**URL:** `/`

**Sections:**

1. **Hero area** — app title, one-line description, the upload zone
2. **Drop zone** — accepts drag-and-drop or click-to-browse. Shows selected file name and size after selection. Accepts any file type. Shows validation error if file exceeds size limit.
3. **Upload options form** (appears after file selected):
   - **Expiration** — segmented control / button group. Options for anonymous: `1h`, `6h`, `24h`, `3d`, `7d`. Additional options for authenticated: `14d`, `30d`. Default: `24h`.
   - **Download limit** — number input. Anonymous: required, range 1–100, default 5. Authenticated: optional, range 1–1000. Has a "No limit" toggle (authenticated only).
   - **Password** — text input, hidden by default behind a toggle. Authenticated only. 4–72 chars. Show/hide password toggle.
   - **Upload button** — disabled while no file selected or during upload.
4. **Upload progress** — replaces the form during upload. Shows:
   - File name
   - Progress bar with percentage
   - Cancel button
5. **Share result** — replaces progress on completion. Shows:
   - The generated share link (full URL)
   - "Copy link" button (with "Copied!" feedback)
   - QR code of the share link
   - File details: name, size, expiration countdown, download limit
   - "Upload another" button to reset
6. **Recent uploads** (below main area) — reads from localStorage. Shows last 10 uploads as a compact list with: file name, creation date, link, status (active/expired based on expiresAt). Each has a "Copy link" button. Expired entries shown as grayed out. Only shown if there are recent uploads.

**Conditional rendering based on auth state:**
- If not authenticated: show a subtle banner/link: "Sign in for larger files, longer retention, and a dashboard" — links to `/login`
- If authenticated: show greeting with user's name; extended options visible

---

### DownloadPage

**URL:** `/s/:slug`

**States:**

1. **Loading** — spinner while fetching metadata from `GET /uploads/:slug`
2. **File available** — shows:
   - File icon (generic, based on mimeType category: image, video, audio, document, archive, other)
   - File name
   - File size (formatted)
   - Download count / limit (e.g. "3 of 5 downloads used" or "3 downloads" if unlimited)
   - Expiration countdown (using useCountdown)
   - Download button
3. **Password required** — if `hasPassword` is true:
   - Show password input field before the download button
   - "Unlock" button submits to `POST /uploads/:slug/verify-password`
   - On success: store downloadToken in component state, reveal download button
   - On failure: show error "Incorrect password", clear input
   - On rate limit (429): show "Too many attempts. Try again later."
4. **File unavailable** — if `isAvailable` is false or HTTP 410:
   - Show message: "This file is no longer available"
   - Sub-message depending on reason: "The download limit has been reached" or "This file has expired"
5. **Not found** — HTTP 404:
   - Show message: "File not found"
   - Sub-message: "This link may be invalid or the file may have been deleted"

**Download action:**
- Clicking download triggers `GET /uploads/:slug/download?token=...` (token only if password-protected)
- Use `window.location.href = downloadUrl` or create a temporary `<a>` element with `download` attribute
- After clicking, show a brief "Download started" feedback message

---

### LoginPage

**URL:** `/login`

**Content:**
- Email input (type="email", required)
- Password input (type="password", required, min 8 chars) with show/hide toggle button
- "Log in" submit button
- Error message area (shows API error like "Invalid email or password")
- "Forgot password?" link → navigates to `/forgot-password`
- Link to signup: "Don't have an account? Sign up"
- Loading state on submit button

**On success:** redirect to `redirect` query param or `/dashboard`.

---

### SignupPage

**URL:** `/signup`

**Content:**
- First name input (optional)
- Last name input (optional)
- Email input (required)
- Password input (required, min 8 chars, max 72)
- **Password strength indicator** — 4-segment bar that fills based on password complexity:
  - 1 segment (red): length ≥ 8
  - 2 segments (orange): + mixed case
  - 3 segments (yellow): + contains number
  - 4 segments (green): + contains special character
  - Label next to bar: "weak" / "ok" / "good" / "strong"
- "Create account" submit button
- Error message area
- Link to login: "Already have an account? Log in"
- Terms & Privacy links text: "By creating an account you agree to our Terms and Privacy Policy."

**On success:** redirect to `/dashboard`.

---

### ForgotPasswordPage

**URL:** `/forgot-password`

**Content:**
- Brief explanation text: "Enter your email and we'll send you a link to reset your password."
- Email input (required)
- "Send reset link" submit button
- Loading state on submit
- **Success state** — after submission, replace form with:
  - Success message: "If an account exists with that email, a reset link has been sent."
  - "Check your inbox" prompt
  - "Back to login" link
- Error message area (only for network/server errors, not "email not found")
- Link back to login: "Remember your password? Log in"

**On submit:** calls `authStore.forgotPassword(email)`. Always shows success state (no email enumeration).

---

### ResetPasswordPage

**URL:** `/reset-password` (requires `?token=` query parameter)

**States:**

1. **No token** — if `?token` query param is missing:
   - Show message: "Invalid reset link"
   - "Request a new one" link → `/forgot-password`

2. **Form** — token is present:
   - New password input (min 8, max 72) with password strength indicator (same as signup)
   - Confirm password input
   - "Reset password" submit button
   - Loading state on submit
   - Error message area (shows "Invalid or expired reset token" if API returns 400)

3. **Success** — after successful reset:
   - Success message: "Password has been reset"
   - "Log in with your new password" link → `/login`

**On submit:** calls `authStore.resetPassword(token, password)`.

---

### DashboardPage

**URL:** `/dashboard`

**Sections:**

1. **Stats overview** — four metric cards:
   - Total uploads (with active count + expired count)
   - Total downloads (with +% trend badge if data available)
   - Storage used (formatted with useFileSize + "X% of Y GB" from `storageQuotaBytes`)
   - Active files count (with mini sparkline chart)
2. **Downloads chart** — bar or line chart showing downloads per day. **Period toggle** with three options: `7d` (default), `30d`, `90d`. Clicking a period calls `dashboardStore.fetchStats(period)` and re-renders the chart with the new data length. Use a lightweight charting approach (CSS bars, SVG, or a small lib like Chart.js via CDN).
3. **File list** — table/card list of user's uploads:
   - **Toolbar:**
     - Search input (debounced, 300ms) — filters by file name
     - Sort dropdown: "Newest", "Oldest", "Largest", "Most downloaded"
     - Status filter: "All", "Active", "Expired"
   - **Each item shows:** file name, size, download count/limit, expiration (countdown or "Expired"), creation date, hasPassword indicator
   - **Actions per item:**
     - Copy link
     - Edit (opens EditFileModal)
     - Delete (opens ConfirmDialog)
   - **Click on item** → navigate to `/dashboard/files/:id`
   - **Pagination** at the bottom (if totalPages > 1)
4. **Empty state** — when no files: message "No files yet" with a link/button to upload (navigates to `/`)

---

### DashboardFilePage

**URL:** `/dashboard/files/:id`

**Content:**

1. **Back link** — "← Back to files"
2. **File header:** file name, size, type, creation date, checksum
3. **Status section:** active/expired, expiration countdown, download count/limit, password status
4. **Share link** — full URL + copy button
5. **Actions:**
   - Edit (inline or modal) — same fields as EditFileModal
   - Delete — with confirmation
6. **Download log table:**
   - Columns: Date/time, IP address, User agent
   - Shows all download events for this file
   - Empty state: "No downloads yet"

---

### EditFileModal

**Triggered from:** DashboardPage file actions or DashboardFilePage

**Fields (all optional, pre-filled with current values):**
- File name (text input)
- Expiration — dropdown of presets. New expiration is calculated from now.
- Download limit — number input. Cannot be set below current downloadCount. Has "Unlimited" toggle.
- Password — set new, or toggle "Remove password"

**Actions:**
- Save → `PATCH /dashboard/uploads/:id`
- Cancel → close modal

**On save:** update the file in the dashboard store, close modal, show success toast.

---

### AdminPage

**URL:** `/admin`

**Header:** Page title + "Export CSV" button. The button opens a dropdown with two options: "Export uploads" and "Export users". Clicking either calls `adminStore.exportCsv('uploads')` or `adminStore.exportCsv('users')` to trigger a CSV file download.

**Layout:** Tab-based navigation with three tabs: "Overview", "Files", "Users"

**Tab: Overview**
- **Row 1** — four large stat cards: total files (with active/expired breakdown), total users (with admin count), anonymous uploads (all-time), total storage
- **Row 2** — four smaller stat cards: uploads today (with "±X% vs yesterday" badge computed from `uploadsToday` vs `uploadsYesterday`), downloads today (same % comparison), total downloads (all-time), average file size (from `avgFileSizeBytes`, formatted)
- **Charts** — two side-by-side charts (30-day): uploads per day (bar chart), downloads per day (line chart)
- **System health panel** — fetched from `GET /admin/health`. Shows a card with 4 inline metrics:
  - API uptime (from `uptime` field)
  - Upload p95 latency (from `uploadLatencyP95Ms`, formatted as "Xms")
  - Storage available (computed: `storageTotalBytes - storageUsedBytes`, formatted)
  - Cleanup queue (from `cleanupQueueSize`, shown as "X jobs")
  - Overall status badge: "operational" (green) if all metrics nominal

**Tab: Files**
- Same list/table component as dashboard, but shows ALL files in the system
- Additional column: uploader (email or "Anonymous" badge)
- Additional filters: user email search, "Anonymous only" checkbox toggle
- Action: Force-delete (any file, with confirmation dialog — message notes "This action will be logged")
- Pagination

**Tab: Users**
- Table with columns: avatar (first letter), name, email, role (ADMIN badge or USER badge), upload count, total downloads, storage used, joined date
- Search by email/name
- Sort: newest, most uploads, most storage
- Pagination

---

### NotFoundPage

**URL:** any unmatched route

**Content:** "Page not found" message with a link back to home.

---

## Shared Components

### AppHeader

- App logo/name — links to `/`
- Navigation:
  - If not authenticated: "Log in" and "Sign up" links
  - If authenticated: user display name, "Dashboard" link, "Log out" button
  - If admin: additional "Admin" link
- Mobile: hamburger menu for navigation

### AppFooter

- Minimal footer with app name

### Pagination

- Props: `page`, `totalPages`
- Emits: `update:page`
- Shows: Previous, page numbers (with ellipsis for large ranges), Next
- Disabled states for first/last page

### ConfirmDialog

- Props: `title`, `message`, `confirmLabel`, `cancelLabel`, `variant` (danger/normal)
- Emits: `confirm`, `cancel`
- Modal overlay with focus trap

### Toast

- Global toast notification system
- Types: success, error, info
- Auto-dismiss after 4 seconds
- Stack up to 3 visible toasts
- Positioned top-right

### LoadingSpinner

- Simple spinner/loading indicator
- Props: `size` (sm/md/lg)

---

## localStorage Usage

| Key | Value | Purpose |
|-----|-------|---------|
| `filedrop_recent` | JSON array of `UploadResult` (max 10) | "Recent uploads" on home page for all users |
| `filedrop_anon_token` | UUID string | Sent as `anon_token` cookie for anonymous rate limiting (set once, persisted) |

Authenticated users' data is server-side only. localStorage is supplementary for convenience.

---

## Error Handling

| HTTP Status | Behavior |
|-------------|----------|
| `401` | Clear auth store, redirect to `/login` (except during initial `/auth/me` check) |
| `403` | Show error toast "Access denied" |
| `404` | Show "Not found" in context (file not found on download page, etc.) |
| `409` | Show specific error from response body |
| `410` | File unavailable state on download page |
| `413` | "File is too large" error on upload |
| `429` | "Too many requests. Please wait." — show retry-after if available |
| `500` | "Something went wrong. Please try again." |

All API errors should show user-friendly messages, never raw error objects.

---

## File Type Icons

Map mimeType to icon category for display on download page and file lists:

| mimeType prefix | Category |
|----------------|----------|
| `image/` | Image |
| `video/` | Video |
| `audio/` | Audio |
| `application/pdf` | PDF |
| `application/zip`, `application/x-rar`, `application/x-7z`, `application/gzip` | Archive |
| `text/` | Text |
| Everything else | Generic file |

Use simple SVG icons or emoji for each category. No external icon library required.

---

## Key UX Behaviors

1. **Upload is the hero action** — the home page is dominated by the upload zone. Everything else is secondary.
2. **Zero friction for anonymous** — no popups, no "sign up" gates. Just drop a file and get a link.
3. **Copy link feedback** — the copy button should visually confirm (text changes to "Copied!", revert after 2s).
4. **Optimistic UI** — file deletion removes from list immediately, rolls back on error.
5. **Debounced search** — 300ms debounce on all search inputs before API call.
6. **Responsive** — all pages functional at 375px width. File lists switch to card layout on mobile.
7. **Loading states** — every async operation shows a loading indicator. Never a blank/frozen screen.
8. **Expired file cleanup** — when reading `filedrop_recent` from localStorage, filter out entries where `expiresAt < now`. Write back the filtered list.
