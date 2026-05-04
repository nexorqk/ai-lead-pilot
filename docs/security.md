# Security

Current controls:

- No secrets are committed; `.env` and `.env.production` are ignored.
- API input and AI output are validated with Zod.
- API errors avoid stack traces in production.
- Admin data access is organization-scoped.
- Production Compose does not publish PostgreSQL or Redis ports.
- OpenAI provider only runs when selected and configured with an API key.
- AI prompts avoid sending secrets and only include the lead fields needed for analysis.

Temporary shortcut:

- Full authentication and role checks are not implemented. The API uses a clearly named demo organization context until Phase 2.

Do not add:

- Hardcoded credentials.
- Destructive migrations in deployment scripts.
- Fake production auth.
- PII dumps in logs or AI prompts.
- Public database or Redis ports in production.
