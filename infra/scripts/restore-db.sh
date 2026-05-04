#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

backup_file="${1:-}"
if [[ -z "$backup_file" ]]; then
  echo "Usage: DATABASE_URL=... infra/scripts/restore-db.sh /path/to/backup.dump" >&2
  exit 2
fi

if [[ ! -f "$backup_file" ]]; then
  echo "Backup file does not exist: $backup_file" >&2
  exit 2
fi

if [[ "${CONFIRM_RESTORE:-}" != "I_UNDERSTAND_THIS_OVERWRITES_DATA" ]]; then
  echo "Refusing restore without CONFIRM_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_DATA" >&2
  exit 2
fi

pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$backup_file"
echo "Restore completed from $backup_file"
