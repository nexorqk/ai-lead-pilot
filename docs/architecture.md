# Architecture

LeadPilot AI is a pnpm monorepo:

- `apps/web`: Next.js App Router frontend.
- `apps/api`: Fastify API with thin route handlers and service-layer business logic.
- `apps/worker`: BullMQ worker for background AI analysis jobs.
- `packages/shared`: Zod schemas, enums, and DTO types.
- `packages/database`: Prisma schema, client export, and seed data.

The first vertical slice is:

1. Customer submits `/book`.
2. Web posts to `POST /api/leads`.
3. API validates with Zod, resolves the demo organization, creates or updates the customer, creates the lead and first message.
4. Owner opens `/admin/leads/:id`.
5. Owner triggers `POST /api/leads/:id/analyze`.
6. API calls the configured AI provider, validates the output, stores `LeadAiAnalysis`, and updates lead status/quality.

Organization scoping is enforced in lead queries. Until auth exists, `DEMO_ORGANIZATION_ID` or the first seeded organization is used and documented as temporary.
