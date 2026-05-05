# Security

Current controls:

- No secrets are committed; `.env` and `.env.production` are ignored.
- Admin routes require database-backed HttpOnly cookie sessions.
- API organization scope is resolved from `OrganizationMember` for authenticated admin requests.
- Role checks are enforced for AI analysis actions.
- Team management is owner-only and preserves at least one owner per organization.
- Notification and audit list endpoints require authenticated organization membership.
- API responses include request IDs for support/debugging.
- Security headers are applied with Fastify Helmet.
- Public lead submission and login routes are rate limited.
- API input and AI output are validated with Zod.
- API errors avoid stack traces in production.
- Admin data access is organization-scoped.
- Team APIs return `hasPassword` only and never expose password hashes.
- Password setup links use hashed one-time tokens, expire, and are marked used after a password is created.
- Production Compose does not publish PostgreSQL or Redis ports.
- OpenAI provider only runs when selected and configured with an API key.
- AI prompts avoid sending secrets and only include the lead fields needed for analysis.

Temporary shortcut:

- Public lead intake still uses `DEMO_ORGANIZATION_ID` or the first seeded organization until public business pages support organization slugs.
- Registration, password reset, automatic email invite delivery, account lockout, and MFA are not implemented.

Do not add:

- Hardcoded credentials.
- Destructive migrations in deployment scripts.
- Fake production auth.
- PII dumps in logs or AI prompts.
- Public database or Redis ports in production.
