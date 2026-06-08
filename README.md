<div align="center">

<img src="docs/mega-logo.svg" alt="Mega" height="88" />

### Share files via short, expiring links — with passwords, download limits, and a full admin dashboard.

<p>
  <img alt="Vue" src="https://img.shields.io/badge/Vue_3-42b883?style=for-the-badge&logo=vuedotjs&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

<p>
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A520-339933?style=flat-square&logo=nodedotjs&logoColor=white" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-9-F69220?style=flat-square&logo=pnpm&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white" />
</p>

<p>
  <img alt="Tests" src="https://img.shields.io/badge/tests-56%20passing-success?style=flat-square&logo=jest&logoColor=white" />
  <img alt="Coverage" src="https://img.shields.io/badge/coverage-31%25-orange?style=flat-square&logo=jest&logoColor=white" />
  <img alt="Code style" src="https://img.shields.io/badge/code_style-prettier-ff69b4?style=flat-square&logo=prettier&logoColor=white" />
  <img alt="PRs" src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/license-Private-lightgrey?style=flat-square" />
  <img alt="Maintained" src="https://img.shields.io/badge/maintained-yes-brightgreen?style=flat-square" />
</p>

<br />

```
Drop a file  →  https://filedrop.app/s/aB3xY7  →  Share the link
```

**Anonymous out of the box.** **Self-hostable.** **Expires automatically.**

</div>

---

## ✨ Highlights

| | |
|---|---|
| 📤 **Anonymous uploads** | No account needed — pick a download limit and share. |
| 🔗 **Short, opaque links** | `nanoid`-based slugs served at `/s/:slug`. |
| ⏳ **Auto-expiring** | A scheduled job purges expired files from storage **and** the database. |
| 🔒 **Password-protected downloads** | Gated behind a short-lived JWT download token. |
| 📊 **Download limits & logging** | Cap a link to *N* downloads; every access is recorded. |
| 🧑‍💻 **User dashboard** | Manage uploads, edit settings, view per-file stats. |
| 🛡️ **Admin dashboard** | Site-wide stats, user & upload management. |
| 📧 **Email + Swagger** | SMTP password reset (console fallback) and auto-generated API docs at `/api/docs`. |

> Sessions use an `sid` cookie with CSRF protection. Authenticated users get larger files, longer retention, and password protection; anonymous uploads just need a download limit (1–100).

---

## 📑 Table of contents

- [Tech stack](#-tech-stack)
- [Architecture](#-architecture)
- [How it works](#-how-it-works)
- [Quick start](#-quick-start)
- [Scripts](#-scripts)
- [Configuration](#-configuration)
- [Data model](#-data-model)
- [Auth & uploads](#-auth--uploads)
- [Testing & coverage](#-testing--coverage)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)

---

## 🧱 Tech stack

| Layer        | Technology                                                        |
|--------------|-------------------------------------------------------------------|
| **Frontend** | Vue 3 · Vite · Pinia · Vue Router · Tailwind CSS 4 · TypeScript    |
| **Backend**  | NestJS 11 · Prisma 7 · class-validator · JWT · bcrypt · Swagger    |
| **Database** | PostgreSQL 16                                                     |
| **Storage**  | RustFS (S3-compatible object storage) via the AWS SDK             |
| **Shared**   | `@filedrop/shared` — framework-agnostic types & constants         |
| **Tooling**  | pnpm workspaces · Docker Compose · Jest · ESLint · Prettier       |

---

## 🗺️ Architecture

A **pnpm monorepo** with three workspaces. The Vue SPA talks to the NestJS API through a Vite dev proxy (`/api` → `localhost:3000`).

```
        ┌──────────────────────────────────────────┐
        │                frontend/                 │
        │           Vue 3 · Vite · Pinia           │
        │                  :5173                   │
        └────────────────────┬─────────────────────┘
                             │
                             │   « /api (Vite proxy) · JSON · cookies »
                             │
        ┌────────────────────┴─────────────────────┐
        │                 backend/                 │
        │           NestJS 11 · Prisma 7           │
        │                  :3000                   │
        └─────────┬──────────────────────┬─────────┘
                  │                      │
           Prisma │                      │ AWS SDK
                  ▼                      ▼
        ┌──────────────────┐   ┌──────────────────┐
        │  PostgreSQL 16   │   │   RustFS / S3    │
        │      :5432       │   │  :9000 · :9001   │
        └──────────────────┘   └──────────────────┘

   shared/  ·  @filedrop/shared — types & constants used by both apps
```

### Repository layout

```
FileDrop/
├── backend/      ⚙️  NestJS API — auth · uploads · downloads · admin · dashboard · cleanup · mail
├── frontend/     🖥️  Vue 3 + Vite SPA
├── shared/       🔗  @filedrop/shared — types/constants imported by both
├── docs/         📚  backend & frontend technical declarations
└── docker-compose.yml   🐳  Postgres + RustFS
```

---

## 🔁 How it works

The full lifecycle of a share — from upload to an expiring, password-gated download:

```
  UPLOAD
  ╶───────────────────────────────────────────────────────────────────╴
   1 │ Uploader     picks a file, sets a download limit (+ password*)
   2 │ frontend/  ─▶ POST /api/uploads   (multipart)
   3 │ backend/   ─▶ stores the object  ························▶ RustFS/S3
   4 │           ─▶ creates Upload  (slug · expiry · limit) ····▶ Postgres
   5 │           ◀─ returns  { slug }
   6 │ Uploader     gets the share link   ▸  https://…/s/aB3xY7

  DOWNLOAD  (later)
  ╶───────────────────────────────────────────────────────────────────╴
   1 │ Downloader ─▶ opens  /s/aB3xY7
   2 │ backend/   ─▶ looks the slug up  ·······················▶ Postgres
   3 │           ?  expired / limit reached  ─────────────────▶ 410 Gone ✗
   4 │           ?  password set  ──▶ prompt  ──▶ short-lived JWT token
   5 │ backend/   ─▶ streams the object  ······················◀ RustFS/S3
   6 │           ─▶ logs download + bumps counter  ············▶ Postgres
   7 │ Downloader ◀─ receives the file  ⬇
```

<sub>* Password protection is an authenticated-only feature; anonymous uploads just set a download limit (1–100).</sub>

---

## 🚀 Quick start

> **Prerequisites:** Node.js 20+ · pnpm 9+ · Docker

```bash
# 1️⃣  Bring up Postgres + RustFS
cp .env.example .env
pnpm infra:up

# 2️⃣  Install all workspace dependencies
pnpm install

# 3️⃣  Configure the backend and run migrations
cp backend/.env.example backend/.env
pnpm --filter backend prisma:generate
pnpm --filter backend prisma:migrate

# 4️⃣  Run the API and the SPA (in two terminals)
pnpm dev:backend
pnpm dev:frontend
```

<details>
<summary><b>🪟 Windows / PowerShell?</b> Use <code>Copy-Item</code> instead of <code>cp</code></summary>

```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
```
</details>

### Where things live

| Service           | URL                              |
|-------------------|----------------------------------|
| 🖥️ Frontend (Vite) | http://localhost:5173            |
| ⚙️ Backend API     | http://localhost:3000/api        |
| 📚 Swagger docs    | http://localhost:3000/api/docs   |
| 🪣 RustFS S3 API   | http://localhost:9000            |
| 🎛️ RustFS console  | http://localhost:9001            |

### 👑 Create an admin

Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` (optionally `ADMIN_FIRSTNAME` / `ADMIN_LASTNAME`) in `backend/.env` **before** starting the backend. On boot, the bootstrap service creates the admin if it doesn't already exist.

---

## 🛠️ Scripts

**Root** (`pnpm <script>`):

| Command             | Description                              |
|---------------------|------------------------------------------|
| `dev:backend`       | Start the NestJS API in watch mode       |
| `dev:frontend`      | Start the Vite dev server                |
| `build`             | Build every workspace package            |
| `lint`              | Lint every workspace package             |
| `infra:up`          | Start Postgres + RustFS (Docker Compose) |
| `infra:down`        | Stop the infrastructure containers       |
| `infra:logs`        | Tail infrastructure logs                 |

**Backend** (`pnpm --filter backend <script>`):

| Command                  | Description                |
|--------------------------|----------------------------|
| `test`                   | Run the Jest test suite    |
| `prisma:generate`        | Generate the Prisma client |
| `prisma:migrate`         | Apply migrations (dev)     |
| `prisma:migrate:deploy`  | Apply migrations (prod)    |
| `prisma:studio`          | Open Prisma Studio         |

---

## ⚙️ Configuration

Two `.env` files drive the app:

- **`.env`** (repo root) — infra for Docker Compose: Postgres credentials/ports, RustFS keys/ports. → [.env.example](.env.example)
- **`backend/.env`** — the API server. → [backend/.env.example](backend/.env.example)

Key backend settings:

| Variable                  | Purpose                                                        |
|---------------------------|----------------------------------------------------------------|
| `DATABASE_URL`            | PostgreSQL connection string                                   |
| `SESSION_TTL_DAYS`        | Session cookie lifetime                                        |
| `BCRYPT_ROUNDS`           | Password hashing cost                                          |
| `DOWNLOAD_TOKEN_SECRET`   | JWT secret for password-protected download tokens              |
| `S3_*`                    | RustFS / S3 endpoint, region, keys, and bucket                 |
| `MAX_FILE_SIZE_ANON_MB`   | Max upload size for anonymous users                            |
| `MAX_FILE_SIZE_USER_MB`   | Max upload size for authenticated users                        |
| `USER_STORAGE_QUOTA_GB`   | Per-user storage quota                                         |
| `STORAGE_TOTAL_BYTES`     | Site-wide storage cap                                          |
| `FRONTEND_URL`            | Allowed CORS origin / link base                                |
| `SMTP_*`                  | Mail delivery (blank → reset links are logged to the console)  |
| `ADMIN_*`                 | Optional admin account bootstrap                               |

---

## 🗃️ Data model

Prisma models — see [backend/prisma/schema.prisma](backend/prisma/schema.prisma):

| Model                  | What it holds                                                                 |
|------------------------|-------------------------------------------------------------------------------|
| **User**               | Accounts with `USER` / `ADMIN` roles                                          |
| **Session**            | Hashed session + CSRF tokens, IP/user-agent, expiry                           |
| **Upload**             | File metadata, storage key, slug, optional password hash, limit/count, expiry |
| **DownloadLog**        | One row per download — powers stats and limit enforcement                     |
| **PasswordResetToken** | Single-use, expiring reset tokens                                             |

An `Upload` belongs to a user **or** to an anonymous token.

---

## 🔐 Auth & uploads

- **Sessions** use an `sid` cookie plus CSRF protection: a `csrf_token` cookie is echoed back in an `x-csrf-token` header. CSRF guards protect admin, auth, and dashboard mutations.
- **Uploads** use an optional-auth guard and are exempt from CSRF, so anonymous uploads work. Anonymous uploads must specify a download limit (1–100); password protection is authenticated-only. Authenticated users get larger size limits and longer retention.

---

## 🧪 Testing & coverage

```bash
pnpm --filter backend test                 # run the suite
pnpm --filter backend test --coverage      # with a coverage report
```

Current backend suite: **56 passing / 59 total** ([Jest](https://jestjs.io)).

| Metric      | Coverage |
|-------------|:--------:|
| Statements  | `31.02%` |
| Branches    | `30.42%` |
| Functions   | `21.05%` |
| Lines       | `31.00%` |

> ℹ️ 3 specs in `slug.service.spec.ts` currently fail under Jest because `nanoid` is ESM-only (`dynamic import without --experimental-vm-modules`) — a known environment/config quirk, not a code bug. Growing coverage is on the [roadmap](#-roadmap).

---

## 🗺️ Roadmap

- [x] Anonymous & authenticated uploads
- [x] Expiring links + scheduled cleanup
- [x] Password-protected downloads (JWT)
- [x] Download limits & logging
- [x] User & admin dashboards
- [x] Swagger API docs
- [ ] Raise backend test coverage & fix the `nanoid` ESM Jest config
- [ ] Frontend component/E2E tests
- [ ] CI pipeline (lint + test + build)
- [ ] Resumable / chunked uploads for large files
- [ ] Dockerfile + production compose for the app itself

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. **Fork** the repo and create a branch: `git checkout -b feat/my-feature`
2. Make your changes — keep them lint-clean: `pnpm lint`
3. Run the tests: `pnpm --filter backend test`
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat: …`, `fix: …`)
5. Open a Pull Request describing the change

Code is formatted with **Prettier** and linted with **ESLint** — both run per-workspace via `pnpm lint`.

---

## 📄 License

This project is **private** and unlicensed by default. Add an OSI-approved license (e.g. [MIT](https://choosealicense.com/licenses/mit/)) before publishing if you intend to distribute it.

---

## 🙏 Acknowledgements

Built on the shoulders of great open-source projects:

[![Vue](https://img.shields.io/badge/Vue-42b883?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![RustFS](https://img.shields.io/badge/RustFS-000000?style=flat-square&logo=rust&logoColor=white)](https://github.com/rustfs/rustfs)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

<div align="center">
<br />
<sub>Built with Vue · NestJS · Prisma · PostgreSQL · RustFS</sub>
</div>
