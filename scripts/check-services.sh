#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# check-services.sh
# Verifies all local services are running for Confluence dev.
# Usage: bash scripts/check-services.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

check() {
  local label="$1"
  local msg="$2"
  if [ "$3" -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $label"
    echo -e "    ${YELLOW}$msg${NC}"
    FAIL=$((FAIL + 1))
  fi
}

# ── 1. Dev server (port 5173) ──
curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/ 2>/dev/null | grep -q '200'
check "Dev server"       "http://localhost:5173/ not responding — run: npm run dev" $?

# ── 2. Supabase REST API (port 54321) — check port is listening ──
lsof -i :54321 2>/dev/null | grep -q LISTEN
check "Supabase API"     "Port 54321 not listening — run: supabase start" $?

# ── 3. Supabase DB (port 54322) ──
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c 'SELECT 1;' 2>/dev/null | grep -q '1'
check "Supabase Database" "postgresql://127.0.0.1:54322 not accessible — run: supabase start" $?

# ── 4. Supabase Studio (port 54323) ──
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:54323/ 2>/dev/null | grep -q '200'
check "Supabase Studio"  "http://127.0.0.1:54323/ not responding — run: supabase start" $?

# ── 5. Admin RPC functions ──
ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY .env.local 2>/dev/null | cut -d= -f2- | tr -d '"')
if [ -n "$ANON_KEY" ]; then
  RPC_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:54321/rest/v1/rpc/admin_get_users" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "apikey: $ANON_KEY" 2>/dev/null)
  if [ "$RPC_STATUS" = "200" ]; then
    check "Admin RPC"        "admin_get_users available" 0
  elif [ "$RPC_STATUS" = "404" ]; then
    check "Admin RPC"        "admin_get_users returns 404 — run: bash scripts/setup-local.sh" 1
  else
    check "Admin RPC"        "admin_get_users returned HTTP $RPC_STATUS" 1
  fi
else
  check "Admin RPC"        ".env.local not found — can't check RPC" 1
fi

# ── 6. Seed data check ──
NOTE_COUNT=$(PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -tAc 'SELECT COUNT(*) FROM public.notes;' 2>/dev/null || echo "0")
if [ "$NOTE_COUNT" -gt 0 ] 2>/dev/null; then
  check "Seed data"        "$NOTE_COUNT notes in database" 0
else
  check "Seed data"        "No notes found — run: bash scripts/setup-local.sh" 1
fi

# ── Summary ──
echo ""
echo "═══════════════════════════════════════════════"
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}All $PASS checks passed!${NC}"
  echo "  Everything is ready for development."
else
  echo -e "  ${YELLOW}$PASS passed, $FAIL failed${NC}"
  echo "  Fix the issues above before proceeding."
fi
echo "═══════════════════════════════════════════════"
