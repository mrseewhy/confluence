#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Back up the Confluence database.
#
# Dumps the public schema (schema + data) from either the local
# stack or the linked production project.
#
# Usage:
#   ./scripts/backup-db.sh              # local (default)
#   ./scripts/backup-db.sh --prod       # linked production project
#   ./scripts/backup-db.sh --prod --out ./backups
#
# Restore:
#   psql "$DATABASE_URL" -f backups/<file>.sql
#
# Notes:
#   - Uses pg_dump in plain SQL so a backup is readable and restorable
#     with a stock psql client.
#   - Never prints connection strings or credentials.
#   - Refuses to write a backup that is empty.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

MODE="local"
OUT_DIR="./backups"
[[ "${1:-}" == "--prod" ]] && MODE="prod"
[[ "${2:-}" == "--out" ]] && OUT_DIR="${3:-./backups}"
[[ "${1:-}" == "--out" ]] && OUT_DIR="${2:-./backups}"

mkdir -p "$OUT_DIR"

if [[ "$MODE" == "prod" ]]; then
  echo "═══ Backing up LINKED (production) database ═══"
  # Ask the CLI for a direct connection string; keep it in a variable and
  # never echo it.
  DB_URL=$(supabase db url --linked 2>/dev/null | tr -d '\r\n' || true)
  if [[ -z "$DB_URL" ]]; then
    echo "Could not resolve the linked database URL. Is the project linked?"
    exit 1
  fi
else
  echo "═══ Backing up LOCAL database ═══"
  # Local stack: known host/port from supabase/config.toml.
  DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install the PostgreSQL client tools first."
  exit 1
fi

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="${OUT_DIR}/confluence-${MODE}-${STAMP}.sql"

echo "  Writing to ${FILE}"
# --no-owner/--no-privileges keep the dump portable between environments.
pg_dump "$DB_URL" \
  --schema=public \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  > "$FILE"

SIZE=$(wc -c < "$FILE" | tr -d ' ')
if [[ "$SIZE" -lt 1024 ]]; then
  echo "  Backup looks too small (${SIZE} bytes) — treating as failed."
  rm -f "$FILE"
  exit 1
fi

# Quick sanity check: the dump should contain our core tables.
for t in notes folders profiles; do
  if ! grep -q "CREATE TABLE public.${t}" "$FILE"; then
    echo "  Warning: ${t} not found in dump — backup may be incomplete."
  fi
done

echo "  OK — $(numfmt --to=iec "$SIZE" 2>/dev/null || echo "${SIZE} bytes")"
echo ""
echo "  Restore with:"
echo "    psql \"\$DATABASE_URL\" -f ${FILE}"
