# FileDrop

File-sharing web service. pnpm monorepo.

## Layout

- `backend/` — NestJS 11 + Prisma 7 + PostgreSQL + RustFS (S3)
- `shared/` — `@filedrop/shared` — types and contracts shared between backend and frontend
- `frontend/` — (to be added)

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Postgres + RustFS)

## Quick start

```bash
# 1. Bring up Postgres + RustFS
cp .env.example .env
pnpm infra:up

# 2. Install everything
pnpm install

# 3. Backend env + migrations
cp backend/.env.example backend/.env
pnpm --filter backend prisma:generate
pnpm --filter backend prisma:migrate

# 4. Run backend in watch mode
pnpm dev:backend
```

Backend listens on `http://localhost:3000`, API prefix `/api`.

RustFS S3 endpoint: `http://localhost:9000` — console: `http://localhost:9001`.
