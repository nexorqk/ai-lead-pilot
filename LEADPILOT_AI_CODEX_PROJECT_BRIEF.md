# LeadPilot AI — Codex Project Creation Brief

Use this file as the initial task prompt for Codex when starting the LeadPilot AI repository.

Place this file in the repository root next to `AGENTS.md`, then open Codex in that directory and ask it to follow this brief.

---

## Prompt to give Codex

You are working in the root of a new project called **LeadPilot AI**.

First, read `AGENTS.md` and follow it as the durable project instruction file. Then implement this project creation brief.

Your goal is to create a production-like monorepo for an AI-powered lead intake, booking, and CRM platform for small businesses.

This must not be a shallow demo. Build the foundation as if this could become a real SaaS system deployed to a VPS with Docker Compose, Caddy, PostgreSQL, Redis, backups, health checks, and documented operations.

Do not ask for clarification unless a destructive action is required. Make reasonable technical choices and document them.

---

## Product concept

LeadPilot AI helps a small business capture, qualify, manage, and convert customer leads.

Core user story:

1. A customer opens a public business page.
2. The customer submits a lead/booking request.
3. The backend validates and stores the request.
4. An AI analysis job classifies the lead.
5. The business owner sees the lead in an admin dashboard.
6. The owner can review AI summary, quality, urgency, missing fields, and suggested next action.
7. Later phases will add booking calendar, notifications, team roles, backups, monitoring, and production deployment.

Initial business vertical: local services such as barbers, salons, repair workers, photographers, tutors, small clinics, and event services.

The product should feel like a serious SaaS dashboard, not a generic admin template.

---

## Hard technical choices for the initial implementation

Use these choices unless the existing repository has already standardized something else:

```txt
Package manager: pnpm
Monorepo: pnpm workspaces
Language: TypeScript
Frontend: Next.js App Router
UI: Tailwind CSS + simple reusable components; shadcn/ui may be added if convenient
Backend: Fastify
Database: PostgreSQL
ORM: Prisma
Queue/cache: Redis + BullMQ
AI provider: pluggable provider with OpenAI implementation and local mock implementation
Validation: Zod
Testing: Vitest where practical
Deployment: Docker Compose
Reverse proxy: Caddy
```

For the first implementation, prioritize a working vertical slice over perfect completeness.

---

## Expected repository structure

Create or move toward this structure:

```txt
leadpilot-ai/
  apps/
    web/
      src/
      package.json
    api/
      src/
      package.json
    worker/
      src/
      package.json

  packages/
    shared/
      src/
      package.json
    database/
      prisma/
        schema.prisma
      src/
      package.json

  infra/
    caddy/
      Caddyfile
    scripts/
      deploy.sh
      backup-db.sh
      restore-db.sh

  docs/
    architecture.md
    deployment.md
    backup-restore.md
    incident-runbook.md
    security.md

  docker-compose.dev.yml
  docker-compose.prod.yml
  .env.example
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
  README.md
  AGENTS.md
```

If some tooling generates a slightly different structure, adapt cleanly but preserve the architecture.

---

## Initial implementation scope

Implement a first vertical slice that proves the architecture works.

### 1. Monorepo foundation

Create:

- root `package.json`
- `pnpm-workspace.yaml`
- root TypeScript config
- common scripts
- `.gitignore`
- `.env.example`
- README with real setup instructions

Root scripts should include, where possible:

```json
{
  "dev": "run all dev services/apps as documented",
  "build": "build all apps/packages",
  "lint": "lint all apps/packages",
  "typecheck": "typecheck all apps/packages",
  "test": "run tests",
  "db:generate": "generate prisma client",
  "db:migrate:dev": "run local migration",
  "db:migrate:deploy": "run production migration",
  "db:seed": "seed demo data"
}
```

Do not add scripts that do not work.

### 2. Shared package

Create `packages/shared` with:

- shared Zod schemas
- lead status enum
- lead quality enum
- DTO/input types for lead creation and AI analysis output

Suggested domain enums:

```txt
LeadStatus:
new
qualified
contacted
booked
lost

LeadQuality:
hot
warm
cold
unknown

LeadUrgency:
today
this_week
this_month
flexible
unknown
```

### 3. Database package

Create `packages/database` using Prisma.

Initial Prisma models:

```txt
User
Organization
OrganizationMember
Customer
Lead
LeadMessage
LeadAiAnalysis
Service
Booking
Notification
AuditLog
```

Minimum requirements:

- Organization-scoped data.
- `Lead` belongs to `Organization`.
- `Customer` belongs to `Organization`.
- `LeadAiAnalysis` belongs to `Lead`.
- `Booking` belongs to `Organization`, `Customer`, and optionally `Lead`.
- Add timestamps.
- Add useful indexes.
- Use enums for lead status and quality where appropriate.
- Add seed data for one demo organization, one demo user, several demo leads, and lead AI analyses.

Do not use destructive production commands.

### 4. API app

Create `apps/api` using Fastify + TypeScript.

Required endpoints for the first vertical slice:

```txt
GET /health
GET /ready
GET /api/leads
GET /api/leads/:id
POST /api/leads
POST /api/leads/:id/analyze
GET /api/dashboard/summary
```

Initial behavior:

- `GET /health`: returns process alive status.
- `GET /ready`: checks database and Redis if available.
- `POST /api/leads`: validates body, creates customer if needed, creates lead and first lead message.
- `POST /api/leads/:id/analyze`: runs AI provider or local mock, validates AI output, stores `LeadAiAnalysis`, updates lead quality/status where appropriate.
- `GET /api/leads`: returns organization-scoped lead list. For the first demo, use a seeded demo organization if auth is not implemented yet.
- `GET /api/dashboard/summary`: returns counts by status and quality.

Important:

- Create a small organization context helper. Until auth exists, use a configured `DEMO_ORGANIZATION_ID` or the first seeded organization. Make it explicit and documented as temporary.
- Validate all inputs.
- Return stable error shapes.
- Do not expose stack traces in production.
- Use structured logs.
- Keep business logic in services, not directly in route handlers.

### 5. Worker app

Create `apps/worker` with a minimal BullMQ setup.

Initial behavior:

- Define a queue for AI lead analysis.
- Add a worker processor that can call the same AI analysis service used by the API.
- For the first vertical slice, direct API analysis can be synchronous, but the worker structure must exist and be documented.
- Add a simple startup log and graceful shutdown.

Do not overbuild the queue layer yet.

### 6. AI provider abstraction

Create an AI provider interface.

Required providers:

```txt
MockLeadAnalysisProvider
OpenAILeadAnalysisProvider
```

The mock provider must work locally without external API calls.

The OpenAI provider should be implemented behind an environment flag and should not run unless `OPENAI_API_KEY` is present and the provider is selected.

Structured output shape:

```json
{
  "intent": "book_service",
  "service": "consultation",
  "urgency": "this_week",
  "budget": "unknown",
  "leadQuality": "warm",
  "missingFields": ["phone", "preferredTime"],
  "summary": "Customer wants a consultation this week but did not provide a phone number.",
  "nextAction": "Ask for phone number and offer two available slots.",
  "confidence": 0.82
}
```

Rules:

- Treat AI output as untrusted input.
- Validate AI output with Zod.
- Handle malformed output.
- Never send secrets to AI.
- Do not store unnecessary prompt data.
- Make the mock provider deterministic enough for tests.

### 7. Web app

Create `apps/web` using Next.js App Router.

Initial screens:

```txt
/
  Landing page explaining LeadPilot AI
/book
  Public lead intake form
/admin
  Dashboard overview
/admin/leads
  Lead list
/admin/leads/[id]
  Lead detail with AI summary and action button
```

Frontend requirements:

- Use TypeScript.
- Use Tailwind for clean SaaS UI.
- Handle loading, success, and error states.
- Forms must validate client-side and server-side.
- Lead list should call the API.
- Lead detail should show customer info, message, status, quality, AI summary, missing fields, next action, and confidence.
- Add a button to trigger lead analysis.
- Keep UI simple but polished.

Do not build fake static data into dashboard screens except as a fallback when the API is unavailable and clearly marked.

### 8. Docker Compose development environment

Create `docker-compose.dev.yml` with:

```txt
postgres
redis
```

Optionally add:

```txt
mailhog
```

Use named volumes.

Expose only local development ports.

Document how to start local services.

### 9. Docker Compose production environment

Create `docker-compose.prod.yml` with planned services:

```txt
web
api
worker
postgres
redis
caddy
```

Add sensible placeholders even if final production hardening is not complete.

Production compose should include:

- restart policies
- healthchecks where practical
- internal network
- Caddy reverse proxy
- only 80/443 exposed publicly
- no source bind mounts for app code
- environment variables from server-side env file

Do not claim it is fully production-ready until tested.

### 10. Caddy

Create `infra/caddy/Caddyfile`.

Use placeholder domains:

```txt
app.leadpilot.example.com
api.leadpilot.example.com
```

Reverse proxy:

```txt
app.leadpilot.example.com -> web:3000
api.leadpilot.example.com -> api:4000
```

Document that domains must be replaced before deploy.

### 11. Backup and restore scripts

Create first-pass scripts:

```txt
infra/scripts/backup-db.sh
infra/scripts/restore-db.sh
```

Use PostgreSQL logical backup with `pg_dump --format=custom`.

The scripts should be safe by default:

- `set -euo pipefail`
- read env variables
- require explicit target file for restore
- refuse to run restore if required env vars are missing
- do not hardcode passwords
- create timestamped backup filenames
- document assumptions

Do not implement dangerous automatic restore against production.

### 12. Documentation

Create these docs with practical content:

```txt
docs/architecture.md
docs/deployment.md
docs/backup-restore.md
docs/incident-runbook.md
docs/security.md
```

README must include:

- what the product does
- stack
- local setup
- environment variables
- development commands
- database commands
- how to run migrations
- how to seed demo data
- how to run API/web
- how to run Docker dev services
- planned production deployment
- backup/restore summary
- known tradeoffs
- roadmap

Documentation must reflect the actual implemented state. Do not write imaginary features as complete.

---

## First-session definition of done

At the end of the first Codex session, the repository should ideally have:

```txt
- pnpm monorepo scaffold
- shared schemas package
- Prisma schema and seed file
- Fastify API with health, ready, lead, dashboard, and analyze endpoints
- Next.js web app with landing, booking form, dashboard, lead list, lead detail
- worker skeleton
- mock AI provider
- OpenAI provider placeholder/implementation behind env
- docker-compose.dev.yml for Postgres/Redis
- docker-compose.prod.yml draft
- Caddyfile draft
- backup and restore scripts
- README and docs
```

If this is too large for one session, prioritize in this order:

```txt
1. Monorepo foundation
2. Database schema + seed
3. API vertical slice
4. Web vertical slice
5. Mock AI analysis
6. Docker dev environment
7. Docs
8. Production compose/Caddy
9. Backup/restore scripts
10. Worker skeleton
```

Stop only after leaving the repository in a runnable or clearly documented partial state.

---

## Implementation order

Follow this order:

### Step 1 — Inspect

Inspect the current directory.

Check:

```txt
- existing package.json
- existing pnpm-workspace.yaml
- existing apps/packages
- existing AGENTS.md
- existing Docker files
- existing docs
```

If files already exist, adapt. Do not overwrite meaningful existing work without reviewing it.

### Step 2 — Plan

Create a short implementation plan in your response before editing.

Mention:

```txt
- files/directories to create
- chosen stack
- first vertical slice
- commands to run
- known tradeoffs
```

### Step 3 — Scaffold

Create the monorepo and package structure.

Keep generated files minimal and understandable.

### Step 4 — Database

Create Prisma schema, migrations if possible, and seed data.

If migration execution is not possible because Postgres is not running, still create schema and document the command.

### Step 5 — API

Implement the Fastify app and core routes.

Keep route handlers thin.

Create services for lead creation and AI analysis.

### Step 6 — Web

Implement landing page, booking form, admin dashboard, lead list, and lead detail.

Use real API calls where possible.

### Step 7 — Worker

Add queue skeleton and AI analysis processor.

### Step 8 — Infra

Add Docker Compose dev/prod, Caddyfile, backup/restore scripts.

### Step 9 — Docs

Update README and docs to match reality.

### Step 10 — Verify

Run the smallest useful verification commands available:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

If a command cannot be run, explain why and leave exact next steps.

---

## Quality gates

Before finishing, verify:

- No real secrets are committed.
- `.env.example` is complete enough.
- The API validates input.
- AI output is schema-validated.
- The database is organization-scoped.
- The dashboard uses API data.
- Docker dev services are documented.
- Production compose does not expose PostgreSQL/Redis publicly.
- Backup/restore scripts are not destructive by default.
- README contains real commands.
- Known tradeoffs are documented.

---

## Security requirements

Never implement shortcuts that would look bad in a production portfolio.

Avoid:

- hardcoded API keys
- hardcoded passwords
- public database ports in production compose
- stack traces in production API responses
- organization data access without org scoping
- fake auth that pretends to be secure
- AI calls that include secrets
- destructive scripts without explicit confirmation

Temporary demo shortcuts are allowed only if they are clearly named and documented, for example:

```txt
Temporary demo organization context is used until full authentication is implemented.
```

---

## Suggested initial API contracts

### Create lead

Request:

```json
{
  "customer": {
    "name": "Alex",
    "email": "alex@example.com",
    "phone": "+000000000"
  },
  "message": "I need a haircut this week, preferably Friday evening.",
  "serviceSlug": "haircut",
  "preferredDate": "2026-05-08",
  "preferredTime": "18:00"
}
```

Response:

```json
{
  "id": "lead_id",
  "status": "new",
  "customer": {
    "name": "Alex",
    "email": "alex@example.com"
  }
}
```

### Analyze lead

Response:

```json
{
  "leadId": "lead_id",
  "leadQuality": "warm",
  "urgency": "this_week",
  "summary": "Customer wants a haircut this week, preferably Friday evening.",
  "missingFields": [],
  "nextAction": "Offer available Friday evening slots.",
  "confidence": 0.82
}
```

### Dashboard summary

Response:

```json
{
  "totalLeads": 12,
  "newLeads": 5,
  "qualifiedLeads": 4,
  "bookedLeads": 3,
  "hotLeads": 2,
  "warmLeads": 7,
  "coldLeads": 3
}
```

---

## UI direction

Use a clean, minimal SaaS style:

```txt
white/dark-neutral background
rounded cards
clear typography
left sidebar for admin
status badges
lead quality badges
simple charts/cards
good empty states
clear CTA buttons
```

No need for heavy animation in the first version.

The UI should communicate:

```txt
"small business owner opens this dashboard and immediately understands which leads need action"
```

---

## Business case to preserve

The project exists to sell AI-assisted development services.

Every implementation decision should support this portfolio narrative:

```txt
I can build a complete business system:
- customer-facing form
- admin dashboard
- backend API
- database
- AI automation
- background jobs
- deployment
- backups
- restore process
- monitoring-ready health checks
```

Do not drift into a generic AI chat app.

---

## Later phases

After the first vertical slice works, continue with these phases.

### Phase 2 — Authentication and authorization

Implement:

```txt
email/password auth
sessions or JWT with refresh tokens
organization membership
roles: owner, manager, staff, viewer
protected admin routes
role-based API permissions
```

### Phase 3 — Booking system

Implement:

```txt
services
availability rules
booking creation
conflict prevention
calendar UI
booking status
customer confirmation state
```

### Phase 4 — Notifications

Implement:

```txt
email provider
Telegram notifications
notification preferences
background jobs
retry behavior
notification audit trail
```

### Phase 5 — Production hardening

Implement:

```txt
rate limiting
request ids
structured logs
error boundaries
API error catalog
health/readiness checks
Docker healthchecks
Caddy production domains
GitHub Actions deploy
```

### Phase 6 — Backups and restore drill

Implement:

```txt
automated pg_dump backup
offsite backup option
restore to staging
documented RPO/RTO
backup success/failure alerts
```

### Phase 7 — Monitoring

Implement:

```txt
Uptime Kuma docs
Prometheus metrics if useful
Grafana dashboard if useful
disk usage checks
container health checks
backup checks
```

---

## Final response format for Codex

When finished, respond with:

```txt
Implemented:
- ...

How to run:
- ...

Commands run:
- ...

Not completed:
- ...

Next recommended task:
- ...
```

Be honest about anything not implemented or not verified.
