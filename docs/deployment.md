# Deployment

The repository includes a VPS-oriented production Compose draft:

- `web`
- `api`
- `worker`
- `postgres`
- `redis`
- `caddy`

Only Caddy exposes public ports `80` and `443`. PostgreSQL and Redis stay on the internal Docker network.

Before deployment:

1. Replace `app.leadpilot.example.com` and `api.leadpilot.example.com` in `infra/caddy/Caddyfile`.
2. Create `.env.production` on the server. Do not commit it.
3. Set strong PostgreSQL credentials.
4. Set `NEXT_PUBLIC_API_URL` and `WEB_ORIGIN` to production domains.
5. Run database migrations with `pnpm db:migrate:deploy` or an equivalent one-off container command.

Deploy helper:

```bash
infra/scripts/deploy.sh
```

This is a first-pass deployment path, not a completed hardening checklist.
