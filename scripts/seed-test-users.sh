#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Seed test users and content into local Supabase
# Run this after: supabase start
# ─────────────────────────────────────────────────────────────
set -euo pipefail

API_URL="${SUPABASE_API_URL:-http://127.0.0.1:54321}"
ANON_KEY="${SUPABASE_ANON_KEY:-sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH}"

echo "Seeding test users and content..."
echo ""

seed_user() {
  local email="$1" pass="$2" name="$3"
  echo "Creating: $name ($email)"

  RESP=$(curl -s -X POST "$API_URL/auth/v1/signup" \
    -H "Content-Type: application/json" \
    -H "apikey: $ANON_KEY" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\",\"data\":{\"full_name\":\"$name\",\"user_type\":\"user\"}}")

  local uid
  uid=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('id',''))" 2>/dev/null || echo "")

  if [ -n "$uid" ]; then
    echo "  ✓ Created (ID: $uid)"
  else
    echo "  ✗ Failed: $RESP"
  fi
  echo "$uid"
}

# ── Create users ──
PRIYA_ID=$(seed_user "priya@confluence.test" "Priya123!" "Priya Patel")
EMMA_ID=$(seed_user "emma@confluence.test" "Emma123!" "Emma Williams")
MARCUS_ID=$(seed_user "marcus.r@confluence.test" "Marcus123!" "Marcus Rivera")

echo ""
echo "=== Users created ==="
echo "Log in at http://127.0.0.1:3000/login"
echo ""
echo "  Regular:  demo@confluence.test / Demo123!"
echo "  Admin:    admin@confluence.test / Admin123!"
echo "  Teacher:  priya@confluence.test / Priya123!"
echo "  Designer: emma@confluence.test / Emma123!"
echo "  DevOps:   marcus.r@confluence.test / Marcus123!"
echo ""
echo "Done!"
