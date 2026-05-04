# LeadPilot AI

LeadPilot AI is a production-style foundation for an AI-assisted lead intake, booking, and CRM platform for small service businesses.

The first vertical slice includes a public lead form, Fastify API, Prisma/PostgreSQL data model, deterministic AI lead analysis, admin dashboard, worker queue skeleton, Docker development services, production Compose draft, Caddy config, and backup/restore scripts.

## Stack

- pnpm workspaces
- TypeScript
- Next.js App Router and Tailwind CSS
- Fastify API
- PostgreSQL, Prisma
- Redis, BullMQ
- Zod validation
- Mock AI provider by default, optional OpenAI provider behind environment flags
- Docker Compose and Caddy

## Local Setup

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d
cp .env.example .env
pnpm db:generate
pnpm db:migrate:dev
pnpm db:seed
pnpm dev
```

Open:

- Web: http://localhost:3000
- API health: http://localhost:4000/health
- Public intake: http://localhost:3000/book
- Admin dashboard: http://localhost:3000/admin

## Environment

Use `.env.example` as the template. Do not commit `.env` or `.env.production`.

Important variables:

- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis connection string.
- `DEMO_ORGANIZATION_ID`: temporary organization context. If empty, the API uses the first seeded organization.
- `AI_PROVIDER`: `mock` by default, or `openai`.
- `OPENAI_API_KEY`: required only when `AI_PROVIDER=openai`.
- `NEXT_PUBLIC_API_URL`: browser-visible API base URL.

## Commands

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm db:generate
pnpm db:migrate:dev
pnpm db:migrate:deploy
pnpm db:seed
```

`pnpm db:migrate:dev` requires the development Postgres container or another reachable PostgreSQL database.

## API Slice

Implemented endpoints:

- `GET /health`
- `GET /ready`
- `GET /api/leads`
- `GET /api/leads/:id`
- `POST /api/leads`
- `POST /api/leads/:id/analyze`
- `GET /api/dashboard/summary`

The current admin API uses a documented temporary demo organization context until real auth and roles are implemented.

## Docker

Development services:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Production draft:

```bash
cp .env.example .env.production
# edit secrets, domains, DATABASE_URL, NEXT_PUBLIC_API_URL, WEB_ORIGIN
docker compose -f docker-compose.prod.yml up -d --build
```

Production Compose is a deploy starting point. Replace placeholder Caddy domains before using it on a VPS.

## Backups

Create a logical PostgreSQL backup:

```bash
DATABASE_URL=postgresql://... infra/scripts/backup-db.sh
```

Restore requires an explicit confirmation variable:

```bash
CONFIRM_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_DATA DATABASE_URL=postgresql://... infra/scripts/restore-db.sh backups/file.dump
```

## Known Tradeoffs

- Authentication, sessions, roles, and protected admin routes are planned for Phase 2.
- The worker has a BullMQ processor, while API-triggered analysis currently runs synchronously for the first slice.
- Production Compose is not fully hardened or load-tested.
- Booking models exist, but full calendar availability and conflict prevention are future work.
- The mock AI provider is deterministic for local development; OpenAI output is schema-validated when enabled.

## Roadmap

1. Auth and organization roles.
2. Booking availability and calendar UI.
3. Email and Telegram notifications.
4. Rate limiting, request IDs, richer error catalog.
5. Automated backups and restore drill.
6. Monitoring with uptime checks and container health visibility.
