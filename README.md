# FileDrop

> Share files via short, expiring links — with optional passwords, download limits, and a full admin dashboard.

FileDrop is a self-hostable file-sharing web service. Drop a file, get a short link like `/s/aB3xY7`, and share it. Links expire automatically, can be password-protected, and can be capped to a fixed number of downloads. Anonymous uploads work out of the box; signing up unlocks larger files, longer retention, and a dashboard to manage everything you've shared.

It's a pnpm monorepo: a **NestJS** API, a **Vue 3** single-page app, and a **shared** types package consumed by both.

---

## Features

- **Anonymous uploads** — no account needed; just pick a download limit and share the link.
- **Authenticated uploads** — larger files, longer retention, password protection, and a personal dashboard.
- **Short, opaque links** — `nanoid`-based slugs served at `/s/:slug`.
- **Expiring links** — every upload has an expiry; a scheduled cleanup job purges expired files from storage and database.
- **Password-protected downloads** — gated behind a short-lived JWT download token.
- **Download limits & counters** — cap a link to N downloads; each access is logged.
- **User dashboard** — manage your uploads, edit settings, view per-file download stats.
- **Admin dashboard** — site-wide stats, user and upload management.
- **Auth** — session-cookie auth (`sid`) with CSRF protection, signup/login, and email-based password reset.
- **Email** — password-reset and notification mail via SMTP (falls back to logging links to the console if SMTP is unconfigured).
- **API docs** — Swagger UI auto-generated at `/api/docs`.
- **Rate limiting** — request throttling via `@nestjs/throttler`.

---

## Tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | Vue 3, Vite, Pinia, Vue Router, Tailwind CSS 4, TypeScript |
| Backend  | NestJS 11, Prisma 7, class-validator, JWT, bcrypt, Swagger |
| Database | PostgreSQL 16 |
| Storage  | RustFS (S3-compatible object storage) via the AWS SDK |
| Shared   | `@filedrop/shared` — framework-agnostic types & constants |
| Tooling  | pnpm workspaces, Docker Compose, Jest, ESLint, Prettier |

---

## Project layout

```
FileDrop/
├── backend/      NestJS API (auth, uploads, downloads, admin, dashboard, cleanup, mail)
├── frontend/     Vue 3 + Vite SPA
├── shared/       @filedrop/shared — types/constants imported by both
├── docs/         Backend & frontend technical declarations
└── docker-compose.yml   Postgres + RustFS
```

The frontend talks to the backend through a Vite dev proxy: `/api` → `http://localhost:3000`.

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Docker** (for PostgreSQL + RustFS)

---

## Quick start

```bash
# 1. Bring up Postgres + RustFS
cp .env.example .env
pnpm infra:up

# 2. Install all workspace dependencies
pnpm install

# 3. Configure the backend and run migrations
cp backend/.env.example backend/.env
pnpm --filter backend prisma:generate
pnpm --filter backend prisma:migrate

# 4. Run the backend (watch mode) and frontend in separate terminals
pnpm dev:backend
pnpm dev:frontend
```

| Service           | URL                            |
|-------------------|--------------------------------|
| Frontend (Vite)   | http://localhost:5173          |
| Backend API       | http://localhost:3000/api      |
| Swagger docs      | http://localhost:3000/api/docs |
| RustFS S3 API     | http://localhost:9000          |
| RustFS console    | http://localhost:9001          |

### Creating an admin

Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` (and optionally `ADMIN_FIRSTNAME` / `ADMIN_LASTNAME`) in `backend/.env` before starting the backend. On boot, the bootstrap service creates the admin account if it doesn't exist.

---

## Scripts

Run from the repo root:

| Command             | Description                              |
|---------------------|------------------------------------------|
| `pnpm dev:backend`  | Start the NestJS API in watch mode       |
| `pnpm dev:frontend` | Start the Vite dev server                |
| `pnpm build`        | Build every workspace package            |
| `pnpm lint`         | Lint every workspace package             |
| `pnpm infra:up`     | Start Postgres + RustFS (Docker Compose) |
| `pnpm infra:down`   | Stop the infrastructure containers       |
| `pnpm infra:logs`   | Tail infrastructure logs                 |

Backend-specific (`pnpm --filter backend <script>`):

| Command                  | Description                          |
|--------------------------|--------------------------------------|
| `test`                   | Run the Jest test suite              |
| `prisma:generate`        | Generate the Prisma client           |
| `prisma:migrate`         | Apply migrations (dev)               |
| `prisma:migrate:deploy`  | Apply migrations (prod)              |
| `prisma:studio`          | Open Prisma Studio                   |

---

## Configuration

Two `.env` files drive the app:

- **`.env`** (repo root) — infrastructure for Docker Compose: Postgres credentials/port, RustFS keys/ports. See [.env.example](.env.example).
- **`backend/.env`** — the API server. See [backend/.env.example](backend/.env.example). Key settings:

| Variable                       | Purpose                                                        |
|--------------------------------|----------------------------------------------------------------|
| `DATABASE_URL`                 | PostgreSQL connection string                                   |
| `SESSION_TTL_DAYS`             | Session cookie lifetime                                        |
| `BCRYPT_ROUNDS`                | Password hashing cost                                          |
| `DOWNLOAD_TOKEN_SECRET`        | JWT secret for password-protected download tokens             |
| `S3_*`                         | RustFS / S3 endpoint, region, keys, and bucket                |
| `MAX_FILE_SIZE_ANON_MB`        | Max upload size for anonymous users                           |
| `MAX_FILE_SIZE_USER_MB`        | Max upload size for authenticated users                       |
| `USER_STORAGE_QUOTA_GB`        | Per-user storage quota                                        |
| `STORAGE_TOTAL_BYTES`          | Site-wide storage cap                                         |
| `FRONTEND_URL`                 | Allowed CORS origin / link base                               |
| `SMTP_*`                       | Mail delivery (blank → reset links are logged to the console) |
| `ADMIN_*`                      | Optional admin account bootstrap                              |

---

## Data model

Prisma models (see [backend/prisma/schema.prisma](backend/prisma/schema.prisma)):

- **User** — accounts with `USER` / `ADMIN` roles.
- **Session** — hashed session + CSRF tokens, IP/user-agent, expiry.
- **Upload** — file metadata, storage key, slug, optional password hash, download limit/count, and expiry. May belong to a user or an anonymous token.
- **DownloadLog** — one row per download, for stats and limit enforcement.
- **PasswordResetToken** — single-use, expiring reset tokens.

---

## Authentication & uploads

- **Sessions** use an `sid` cookie plus CSRF protection: a `csrf_token` cookie is echoed back in an `x-csrf-token` header. CSRF guards protect admin, auth, and dashboard mutations.
- **Uploads** use an optional-auth guard and are exempt from CSRF, so anonymous uploads are allowed. Anonymous uploads must specify a download limit (1–100); password protection is an authenticated-only feature. Authenticated users get larger size limits and longer retention.

---

## Testing

```bash
pnpm --filter backend test
```

---

## License

This project is private and unlicensed by default. Add a license before publishing if you intend to distribute it.
