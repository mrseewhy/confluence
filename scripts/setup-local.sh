#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# setup-local.sh
# Run AFTER `supabase start` to seed data, apply admin RPCs,
# and set user passwords.
#
# Usage:
#   supabase start
#   bash scripts/setup-local.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "═══════════════════════════════════════════════"
echo "  Setting up local Confluence database..."
echo "═══════════════════════════════════════════════"
echo ""

# ── Helper: run SQL file ──
run_sql_file() {
  local label="$1" file="$2"
  printf "  %s..." "$label"
  local out
  out=$(PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f "$file" 2>&1) || {
    echo " FAILED"
    echo "    $out"
    exit 1
  }
  echo " OK"
}

# ── Step 1: Seed demo data (5 users, 90 notes, etc.) ──
run_sql_file "Seeding demo data" "supabase/seed-full.sql"

# ── Step 2: Apply admin RPC functions ──
run_sql_file "Applying admin functions" "supabase/admin-rpc.sql"

# ── Step 3: Set user passwords ──
echo ""
bash scripts/seed-test-users.sh

echo ""
echo "═══════════════════════════════════════════════"
echo "  Setup complete!"
echo "═══════════════════════════════════════════════"
echo ""
echo "  Login at: http://localhost:5173/login"
echo "  Dashboard: http://localhost:5173/dashboard"
echo "  Admin panel: http://localhost:5173/admin/dashboard"
echo ""
echo "  Users:"
echo "    alex@confluence.test   / Alex123!  (admin)"
echo "    sarah@confluence.test  / Sarah123!"
echo "    marcus@confluence.test / Marcus123!"
echo "    priya@confluence.test  / Priya123!"
echo "    emma@confluence.test   / Emma123!"
echo ""
