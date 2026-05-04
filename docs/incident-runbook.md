# Incident Runbook

Initial checks:

1. Open `GET /health` to confirm the API process is alive.
2. Open `GET /ready` to check database and Redis readiness.
3. Check container status with `docker compose -f docker-compose.prod.yml ps`.
4. Inspect logs for the affected service.
5. Use the `x-request-id` response header or error `requestId` to correlate API logs.

Useful commands:

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 api
docker compose -f docker-compose.prod.yml logs --tail=200 web
docker compose -f docker-compose.prod.yml logs --tail=200 worker
docker compose -f docker-compose.prod.yml logs --tail=200 postgres
```

Escalation notes:

- If database readiness fails, verify disk space, credentials, and migration state.
- If Redis readiness fails, new lead analysis jobs cannot be enqueued.
- If analysis jobs stay `pending` or `processing`, inspect worker logs and Redis connectivity.
- If notifications stay `pending`, inspect worker logs and the `notifications` BullMQ queue.
- If public lead submission or login returns `429`, inspect rate-limit settings before treating it as an outage.
- If Caddy fails, verify DNS and placeholder domains.
- Do not run restore against production without an explicit restore plan and a recent backup.
