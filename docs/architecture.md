# Architecture

LeadPilot AI is a pnpm monorepo:

- `apps/web`: Next.js App Router frontend.
- `apps/api`: Fastify API with thin route handlers and service-layer business logic.
- `apps/worker`: BullMQ worker for background AI analysis jobs.
- `packages/shared`: Zod schemas, enums, and DTO types.
- `packages/database`: Prisma schema, client export, and seed data.

The lead intake flow is:

1. Customer opens `/:organizationSlug/book`.
2. Web loads public organization details from `GET /api/public/organizations/:slug`.
3. Web posts to `POST /api/public/organizations/:slug/leads`.
4. API validates with Zod, resolves the organization by slug, creates or updates the customer, creates the lead and first message.
5. Owner opens `/admin/leads/:id`.
6. Owner triggers `POST /api/leads/:id/analyze`.
7. API creates `LeadAiAnalysisJob`, enqueues BullMQ work in Redis, and returns the queued job id.
8. Worker processes the job, calls the configured AI provider, validates the output, stores `LeadAiAnalysis`, updates lead status/quality, and marks the job completed or failed.

Organization scoping is enforced in lead queries. Admin requests authenticate with an HttpOnly session cookie and resolve scope from `OrganizationMember`. Public lead intake resolves the target organization by slug.

Team management is organization-scoped. Owners can add members, change roles, and remove members; non-owners are blocked from member administration and the service prevents removing or downgrading the final owner. New members without passwords receive a one-time password setup token, stored only as a hash, and activate their login through `/setup-account`. Invite messages are created as notifications and delivered by the same BullMQ worker path as other outbound notifications.

Bookings are organization-scoped and can be created from leads. The booking service validates active availability rules and rejects overlaps with requested or confirmed bookings before writing the booking.

Notifications use the same Redis/BullMQ worker process. API events create `Notification` rows and enqueue delivery jobs. The worker currently uses a mock email provider, records send attempts, and marks notifications sent or failed. Audit logs are written for lead creation, analysis queueing, booking creation, and booking status changes.
