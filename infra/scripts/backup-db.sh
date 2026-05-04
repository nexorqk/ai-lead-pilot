#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="${BACKUP_DIR}/leadpilot-${timestamp}.dump"

pg_dump "$DATABASE_URL" --format=custom --file="$target"
chmod 600 "$target"

echo "Backup written to $target"
