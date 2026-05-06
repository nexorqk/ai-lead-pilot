# LeadPilot AI — Quick Start & Verification Guide

Complete step-by-step guide to start the project locally and verify all user flows.

---

## Prerequisites

- Node.js 22+ and pnpm 9+
- Docker and Docker Compose
- Git repository cloned at `~/workspace/ai-lead-pilot`
- Dependencies installed: `pnpm install`
- `.env` file created from `.env.example`

---

## Step 1 — Infrastructure (Docker)

Start PostgreSQL and Redis development services:

```bash
cd /home/alexander/workspace/ai-lead-pilot
docker compose -f docker-compose.dev.yml up -d
```

Verify:

```bash
docker compose -f docker-compose.dev.yml ps
```

Expected output: both `postgres` and `redis` in `Up (healthy)` status.

> **First time only** (or after `down -v`):
>
> ```bash
> pnpm db:migrate:dev
> pnpm db:seed
> ```

---

## Step 2 — Application Servers

Start API, Web, and Worker in separate tmux sessions:

```bash
# API (Fastify)
tmux new-session -d -s leadpilot-api \
  'cd /home/alexander/workspace/ai-lead-pilot/apps/api && pnpm dev'

# Web (Next.js)
tmux new-session -d -s leadpilot-web \
  'cd /home/alexander/workspace/ai-lead-pilot/apps/web && pnpm dev'

# Worker (BullMQ)
tmux new-session -d -s leadpilot-worker \
  'cd /home/alexander/workspace/ai-lead-pilot/apps/worker && pnpm dev'
```

Verify health endpoints:

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4000/ready
```

Expected:
- `health` → `{"status":"ok"}`
- `ready` → `{"status":"ready","checks":{"database":"ok","redis":"ok"}}`

> **Important:** Use `127.0.0.1:3000` in the browser, not `localhost:3000`. Next.js dev server can fail on IPv6 (`::1`).

---

## Step 3 — Verification Flows

### Flow 1: Public Lead Intake (no auth)

1. Open `http://127.0.0.1:3000/demo-studio/book`
2. Fill the form:
   - **Name:** Test Client
   - **Email:** test@example.com
   - **Phone:** +1234567890
   - **Service:** Haircut
   - **Message:** Need a haircut this week
3. Click **Submit request**
4. Expected: green banner `Request received. Lead xxx is now in the dashboard.`
5. Form clears after success

---

### Flow 2: Owner Login

1. Open `http://127.0.0.1:3000/login`
2. Credentials are pre-filled:
   - **Email:** `owner@demo.leadpilot.local`
   - **Password:** `demo-password-123`
3. Click **Log in**
4. Expected: redirect to `http://127.0.0.1:3000/admin`
5. Dashboard loads with cards (Total / New / Qualified / Booked leads)

---

### Flow 3: Lead Detail + AI Analysis

1. From dashboard, click **View all leads**
2. Click the lead created in Flow 1
3. On detail page, observe:
   - Customer info
   - Original message
   - Status: `new`, Quality: `unknown`
4. Click **Analyze with AI**
5. Expected: status changes to `Analysis job pending`
6. Wait 3–5 seconds, refresh page (F5)
7. Expected: AI Summary appears with:
   - Quality badge (hot/warm/cold)
   - Urgency
   - Missing fields
   - Next action
   - Confidence score

> Behind the scenes: the API creates a `LeadAiAnalysisJob` and enqueues it in BullMQ. The Worker processes the job using the mock AI provider.

---

### Flow 4: Logout

1. In the left sidebar, click **Log out**
2. Expected: redirect to `http://127.0.0.1:3000/login`
3. Try to open `http://127.0.0.1:3000/admin` manually
4. Expected: redirect back to `/login` (unauthenticated users cannot access admin)

---

### Flow 5: Password Reset (mock, no real SMTP)

1. Open `http://127.0.0.1:3000/login`
2. Click **Forgot password?**
3. Enter `owner@demo.leadpilot.local`
4. Click **Send reset link**
5. Expected: green banner `If an account exists with this email, a password reset link has been sent.`

> Note: Real email delivery is not configured. The notification is created in the database and processed by the Worker as a mock email (visible in Worker logs only).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `404` on `/demo-studio/book` | API server is down | `tmux kill-session -t leadpilot-api` then restart it |
| `Failed to fetch` on login | API unreachable or proxy broken | Check `curl http://127.0.0.1:3000/api/health` |
| Stay on `/login` after clicking Log in | Browser cache with old JS | Hard reload with `Ctrl+F5` |
| AI analysis never appears | Worker is not running | `tmux capture-pane -t leadpilot-worker -p \| tail -10` |
| `This page could not be found` on `/admin` | SSR cannot reach API | Ensure API is healthy and `API_URL` env is set |
| Empty dashboard with "API unavailable" | Network or API down | Check `curl http://127.0.0.1:4000/health` |

---

## Architecture Reminder

- **Web (`:3000`)** → Next.js App Router, proxies `/api/*` to Fastify
- **API (`:4000`)** → Fastify, handles auth, leads, bookings, team
- **Worker** → BullMQ consumer, processes AI analysis and notifications
- **Postgres (`:5432`)** → Database
- **Redis (`:6379`)** → Queue and cache

All auth cookies are set on `127.0.0.1:3000` because API requests are proxied through Next.js. Never call `localhost:4000` directly from the browser — this bypasses the proxy and creates cookie domain issues.

---

## Shutdown

```bash
# Stop application servers
tmux kill-session -t leadpilot-api
tmux kill-session -t leadpilot-web
tmux kill-session -t leadpilot-worker

# Stop infrastructure
docker compose -f docker-compose.dev.yml down

# Optional: destroy database volumes
# docker compose -f docker-compose.dev.yml down -v
```

---

## Demo Account

```
Email:    owner@demo.leadpilot.local
Password: demo-password-123
Organization: Demo Studio (slug: demo-studio)
```

Created automatically by `pnpm db:seed`.
