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
- `DEMO_ORGANIZATION_ID`: public intake organization context until public business pages support organization slugs.
- `SESSION_SECRET`: at least 32 random characters for signing session cookies.
- `SESSION_COOKIE_NAME`: defaults to `leadpilot_session`.
- `SESSION_TTL_DAYS`: session lifetime in days.
- `PUBLIC_RATE_LIMIT_MAX` / `PUBLIC_RATE_LIMIT_WINDOW`: public lead submission limit.
- `AUTH_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_WINDOW`: login limit.
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

Seed creates a demo owner account:

```txt
owner@demo.leadpilot.local
demo-password-123
```

`pnpm db:migrate:dev` requires the development Postgres container or another reachable PostgreSQL database.

The current test suite includes contract coverage for shared Zod schemas and deterministic mock AI analysis behavior. Additional API/database integration tests are still planned.

## API Slice

Implemented endpoints:

- `GET /health`
- `GET /ready`
- `GET /api/leads`
- `GET /api/leads/:id`
- `POST /api/leads`
- `POST /api/leads/:id/analyze`
- `GET /api/leads/:id/analysis-job`
- `GET /api/bookings`
- `GET /api/bookings/upcoming`
- `GET /api/availability`
- `POST /api/leads/:id/bookings`
- `PATCH /api/bookings/:id/status`
- `GET /api/notifications`
- `GET /api/notification-preferences`
- `GET /api/audit-logs`
- `GET /api/team/members`
- `POST /api/team/members`
- `PATCH /api/team/members/:id/role`
- `DELETE /api/team/members/:id`
- `GET /api/dashboard/summary`

Admin APIs require a session cookie and resolve organization scope from the logged-in user's organization membership. Public lead creation still uses the configured demo/public organization until public pages support organization slugs.

Lead analysis is asynchronous: the API creates a persisted analysis job and enqueues BullMQ work in Redis. The worker consumes the queue, calls the configured AI provider, stores validated analysis output, and updates the job status.

Bookings can be created from leads by authenticated owner/manager/staff users. The API checks active organization availability rules and prevents overlapping requested or confirmed bookings.

Notifications are queued with BullMQ and processed by the worker with a mock email provider. Notification attempts are stored in the database, and lead/booking actions write audit log entries.

Owners can add organization members, change member roles, and remove members. The API prevents exposing password hashes, blocks non-owner team management, and preserves at least one owner per organization.

The API adds request IDs, security headers, stable error bodies with `requestId`, and rate limits on public lead submission and login.

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

- Password reset, registration, email invite delivery, and multi-organization switching are not implemented yet.
- Lead analysis is queued with BullMQ, but queue monitoring and a dedicated job retry dashboard are not implemented yet.
- API/database integration coverage exists for public lead intake, booking conflicts, and team role protections, but it is not exhaustive.
- Production Compose is not fully hardened or load-tested.
- Booking models and overlap prevention exist, but full calendar availability UI is future work.
- The mock AI provider is deterministic for local development; OpenAI output is schema-validated when enabled.

## Roadmap

1. Password reset and email invite delivery.
2. Booking availability and calendar UI.
3. Email and Telegram notifications.
4. Rate limiting, request IDs, richer error catalog.
5. Automated backups and restore drill.
6. Monitoring with uptime checks and container health visibility.
