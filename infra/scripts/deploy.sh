#!/usr/bin/env bash
set -euo pipefail

compose_file="${COMPOSE_FILE:-docker-compose.prod.yml}"

if [[ ! -f ".env.production" ]]; then
  echo "Missing .env.production. Create it on the server; do not commit it." >&2
  exit 2
fi

docker compose -f "$compose_file" pull || true
docker compose -f "$compose_file" build
docker compose -f "$compose_file" up -d
docker compose -f "$compose_file" ps
