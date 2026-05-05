# LeadPilot AI

LeadPilot AI is a full-stack app for AI-assisted lead intake, booking, and customer follow-up for small service businesses.

It captures public service requests, qualifies leads with an AI analysis provider, supports owner/admin workflows, manages bookings, sends operational notifications, and provides the infrastructure needed to run the app with PostgreSQL, Redis, Docker Compose, and Caddy.

## Technology

- Monorepo: pnpm workspaces.
- Language: TypeScript.
- Web app: Next.js App Router, Tailwind CSS, shadcn/ui components.
- API: Fastify with cookie-based sessions, role checks, rate limits, request IDs, and structured error responses.
- Database: PostgreSQL with Prisma schema, migrations, and seed data.
- Background jobs: Redis and BullMQ for lead analysis and notification delivery.
- AI: pluggable lead-analysis provider with deterministic local mode and optional OpenAI integration.
- Validation: Zod schemas shared across apps and packages.
- Infrastructure: Docker Compose for local and VPS deployment, Caddy reverse proxy, backup and restore scripts.

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

> **Note:** `pnpm dev` starts the API, web, and worker apps in parallel. Dev scripts in `apps/api` and `apps/worker` automatically load the root `.env` via `dotenv-cli`, so environment variables are available without manual export.

Open:

- Web: http://localhost:3000
- API health: http://localhost:4000/health
- Public intake: http://localhost:3000/demo-studio/book
- Admin dashboard: http://localhost:3000/admin

## Environment

Use `.env.example` as the template. Do not commit `.env` or `.env.production`.

Important variables:

- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis connection string.
- `DEMO_ORGANIZATION_ID`: fallback organization context for the legacy `/book` intake page.
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

Seed creates a local owner account:

```txt
owner@demo.leadpilot.local
demo-password-123
```

`pnpm db:migrate:dev` requires the development Postgres container or another reachable PostgreSQL database.

The test suite includes shared contract coverage, deterministic mock AI coverage, and database-backed API integration coverage for lead intake, public organization pages, booking conflicts, team roles, password setup, and invite notifications.

## API Slice

Implemented endpoints:

- `GET /health`
- `GET /ready`
- `POST /api/auth/forgot-password`
- `GET /api/auth/reset-password/:token`
- `POST /api/auth/reset-password`
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
- `GET /api/organization/profile`
- `PATCH /api/organization/profile`
- `GET /api/auth/password-setup/:token`
- `POST /api/auth/password-setup`
- `GET /api/public/organizations/:slug`
- `POST /api/public/organizations/:slug/leads`
- `GET /api/dashboard/summary`

Admin APIs require a session cookie and resolve organization scope from the logged-in user's organization membership. Public lead creation supports organization-specific intake pages at `/:organizationSlug/book`; the legacy `/book` route remains as a local fallback.

Lead analysis is asynchronous: the API creates a persisted analysis job and enqueues BullMQ work in Redis. The worker consumes the queue, calls the configured AI provider, stores validated analysis output, and updates the job status.

Bookings can be created from leads by authenticated owner/manager/staff users. The API checks active organization availability rules and prevents overlapping requested or confirmed bookings.

Notifications are queued with BullMQ and processed by the worker with a mock email provider. Notification attempts are stored in the database, and lead/booking actions write audit log entries.

Owners can add organization members, change member roles, remove members, and maintain the public organization profile used by `/:organizationSlug/book`. New members without passwords receive a one-time setup link through the notification pipeline, with the link also returned by the API for local/mock delivery. The API prevents exposing password hashes, blocks non-owner team management, and preserves at least one owner per organization.

The API adds request IDs, security headers, stable error bodies with `requestId`, and rate limits on public lead submission and login.

## Docker

Development services:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Deployment:

```bash
cp .env.example .env.production
# edit secrets, domains, DATABASE_URL, NEXT_PUBLIC_API_URL, WEB_ORIGIN
docker compose -f docker-compose.prod.yml up -d --build
```

Replace placeholder Caddy domains before using the production Compose file on a VPS.

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

- Registration and real SMTP/Telegram invite delivery are not implemented yet.
- Lead analysis is queued with BullMQ, but queue monitoring and a dedicated job retry dashboard are not implemented yet.
- API/database integration coverage exists for public lead intake, organization profile updates, booking conflicts, and team role protections, but it is not exhaustive.
- Production Compose is not fully hardened or load-tested.
- Booking models and overlap prevention exist, but full calendar availability UI is future work.
- The mock AI provider is deterministic for local development; OpenAI output is schema-validated when enabled.

## Roadmap

1. Real SMTP/Telegram invite delivery.
2. Booking availability and calendar UI.
3. Email and Telegram notifications.
4. Automated backups and restore drill.
5. Monitoring with uptime checks and container health visibility.
6. Booking availability and calendar UI polish.
