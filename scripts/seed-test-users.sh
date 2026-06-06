#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Seed test users into local Supabase
# Run this after: supabase start && supabase db reset
#
# Updates passwords for existing seed.sql users (created with
# empty encrypted_password) so they can log in.
# Promotes Alex to admin.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

echo "═══════════════════════════════════════════════"
echo "  Setting passwords for test users..."
echo "═══════════════════════════════════════════════"
echo ""

# ── Helper: run a single SQL statement via supabase db query ──
run_sql() {
  local label="$1" sql="$2"
  printf "  %s..." "$label"
  local out
  out=$(supabase db query "$sql" 2>&1) || {
    echo " FAILED"
    echo "    $out"
    exit 1
  }
  echo " OK"
}

# ── Ensure pgcrypto extension exists ──
echo ""
echo "  ── Installing pgcrypto extension ──"
run_sql "Installing pgcrypto" "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;"

# ── Set password for a user ──
set_user_password() {
  local email="$1" pass="$2" name="$3"
  echo ""
  echo "  ── $name ($email) ──"
  run_sql "Setting password" "UPDATE auth.users SET encrypted_password = extensions.crypt('$pass', extensions.gen_salt('bf')) WHERE email = '$email';"
}

# ── Promote user to admin ──
promote_to_admin() {
  local email="$1"
  run_sql "Promoting to admin" "UPDATE public.profiles p SET user_type = 'admin' FROM auth.users u WHERE p.id = u.id AND u.email = '$email';"
}

# ── Set passwords for all 5 users ──
set_user_password "alex@confluence.test" "Alex123!" "Alex Johnson"
promote_to_admin "alex@confluence.test"

set_user_password "sarah@confluence.test" "Sarah123!" "Sarah Chen"
set_user_password "marcus@confluence.test" "Marcus123!" "Marcus Rivera"
set_user_password "priya@confluence.test" "Priya123!" "Priya Patel"
set_user_password "emma@confluence.test" "Emma123!" "Emma Williams"

echo ""
echo "═══════════════════════════════════════════════"
echo "  All user passwords set!"
echo "═══════════════════════════════════════════════"
echo ""
echo "  ┌─────────────────────┬──────────────────────────────┬──────────────┐"
echo "  │ Email               │ Password                     │ Type         │"
echo "  ├─────────────────────┼──────────────────────────────┼──────────────┤"
echo "  │ alex@confluence.test    │ Alex123!                    │ ★ Admin      │"
echo "  │ sarah@confluence.test   │ Sarah123!                   │ User         │"
echo "  │ marcus@confluence.test  │ Marcus123!                  │ User         │"
echo "  │ priya@confluence.test   │ Priya123!                   │ User         │"
echo "  │ emma@confluence.test    │ Emma123!                    │ User         │"
echo "  └─────────────────────┴──────────────────────────────┴──────────────┘"
echo ""
echo "  Login at: http://localhost:5173/login"
echo "  Dashboard: http://localhost:5173/dashboard"
echo "  Admin panel: http://localhost:5173/admin/dashboard"
echo ""
echo "Done!"
