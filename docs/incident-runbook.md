# Incident Runbook

Initial checks:

1. Open `GET /health` to confirm the API process is alive.
2. Open `GET /ready` to check database and Redis readiness.
3. Check container status with `docker compose -f docker-compose.prod.yml ps`.
4. Inspect logs for the affected service.

Useful commands:

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 api
docker compose -f docker-compose.prod.yml logs --tail=200 web
docker compose -f docker-compose.prod.yml logs --tail=200 worker
docker compose -f docker-compose.prod.yml logs --tail=200 postgres
```

Escalation notes:

- If database readiness fails, verify disk space, credentials, and migration state.
- If Redis readiness fails, lead analysis jobs may not process asynchronously, but synchronous API analysis can still work.
- If Caddy fails, verify DNS and placeholder domains.
- Do not run restore against production without an explicit restore plan and a recent backup.
