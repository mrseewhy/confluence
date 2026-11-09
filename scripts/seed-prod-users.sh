#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Set passwords for the demo/seed accounts on the LINKED
# (production) Supabase project so the live site is usable.
#
# SAFETY: only touches @confluence.test addresses. Real customer
# accounts are never modified — the WHERE clause makes that explicit.
#
# Usage: ./scripts/seed-prod-users.sh [--dry-run]
# ─────────────────────────────────────────────────────────────
set -euo pipefail

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

run_sql() {
  local sql="$1"
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "  [dry-run] $sql"
    return 0
  fi
  supabase db query --linked "$sql" 2>&1 \
    | grep -vE "^WARN|new version|recommend|Initialising|^$" || true
}

echo "═══════════════════════════════════════════════"
echo "  Seed demo passwords on LINKED project"
[[ $DRY_RUN -eq 1 ]] && echo "  (DRY RUN — nothing will change)"
echo "═══════════════════════════════════════════════"

# Refuse to run against anything that isn't the known production project.
# Match on the reference id appearing in the LINKED row; do not depend on
# column positions, which shift when the cursor marker is rendered.
LINKED_REF=$(supabase projects list 2>/dev/null \
  | sed 's/\x1b\[[0-9;]*[A-Za-z]//g' \
  | grep -o 'wiplvypadgnauwwpxcxi' | head -1 || true)
if [[ "${LINKED_REF}" != "wiplvypadgnauwwpxcxi" ]]; then
  echo "  Refusing: the linked project could not be confirmed as wiplvypadgnauwwpxcxi."
  echo "  Run 'supabase link --project-ref wiplvypadgnauwwpxcxi' first."
  exit 1
fi

echo ""
echo "  ── Ensuring pgcrypto ──"
run_sql "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;" >/dev/null 2>&1 || true

set_pw() {
  local email="$1" pass="$2"
  echo "  Setting password for ${email}"
  # The LIKE guard is the safety boundary: no non-test account can match.
  run_sql "UPDATE auth.users
              SET encrypted_password = extensions.crypt('${pass}', extensions.gen_salt('bf')),
                  updated_at = now()
            WHERE email = '${email}'
              AND email LIKE '%@confluence.test';" >/dev/null
}

set_pw "alex@confluence.test"   "Alex123!"
set_pw "sarah@confluence.test"  "Sarah123!"
set_pw "marcus@confluence.test" "Marcus123!"
set_pw "priya@confluence.test"  "Priya123!"
set_pw "emma@confluence.test"   "Emma123!"

echo ""
echo "  ── Verifying (accounts that now have a password) ──"
run_sql "SELECT email,
                (encrypted_password IS NOT NULL AND encrypted_password <> '') AS has_password
           FROM auth.users
          WHERE email LIKE '%@confluence.test'
          ORDER BY email;"

echo ""
echo "═══════════════════════════════════════════════"
echo "  Done. Alex is an admin."
echo "═══════════════════════════════════════════════"
