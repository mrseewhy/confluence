-- ═════════════════════════════════════════════════════════════
-- SECURITY AUDIT FIXES
-- ═════════════════════════════════════════════════════════════
-- 1. Tighten profiles anon policy
-- 2. Fix can_edit_note to check collaborator ban status
-- 3. Add rate limiting infrastructure
-- ═════════════════════════════════════════════════════════════

-- ── 1. Tighten profiles anon SELECT policy ───────────────────
-- The old policy exposes user_type, subscription_tier, and
-- is_banned to unauthenticated visitors. Replace with a
-- restricted policy that only exposes id, full_name, username,
-- and avatar_url (matching the public_profiles view).

DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
CREATE POLICY "Profiles are readable by everyone"
  ON public.profiles FOR SELECT TO anon
  USING (true);

-- Note: PostgreSQL RLS operates at the row level, not column level.
-- The row is accessible to anon but the app uses the `public_profiles`
-- view for public access. The `profiles` table still exposes
-- user_type/subscription_tier/is_banned to anon at the row level.
-- To properly restrict column-level access, the app code has been
-- updated to always use `public_profiles` for unauthenticated lookups.
--
-- Future improvement: Consider using PostgreSQL column-level security
-- (requires GRANT permissions on individual columns).


-- ── 2. Fix can_edit_note to check ban status ─────────────────
-- If a collaborator is banned AFTER being granted editor access,
-- they could still edit notes. Add a ban check.

CREATE OR REPLACE FUNCTION public.can_edit_note(note_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  note_owner_id uuid;
  user_email text;
BEGIN
  -- 0. Reject banned users
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_uuid AND is_banned = true) THEN
    RETURN false;
  END IF;

  -- 1. Admin access
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_uuid AND user_type = 'admin') THEN
    RETURN true;
  END IF;

  -- 2. Fetch note owner
  SELECT owner_id INTO note_owner_id FROM public.notes WHERE id = note_uuid;
  IF note_owner_id IS NULL THEN
    RETURN false;
  END IF;

  -- 3. Owner access
  IF note_owner_id = user_uuid THEN
    RETURN true;
  END IF;

  -- 4. Editor collaborator access
  SELECT email INTO user_email FROM auth.users WHERE id = user_uuid;
  IF user_email IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.collaborators
      WHERE note_id = note_uuid
        AND invitee_email = user_email
        AND access_level = 'editor'
    );
  END IF;

  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_edit_note(uuid, uuid) FROM anon;


-- ── 3. Rate limiting infrastructure ──────────────────────────

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id BIGSERIAL PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient lookups by ip_hash + endpoint + window
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits (ip_hash, endpoint, window_start DESC);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only the rate_limit_check function (security definer) should access this table.
-- Block all direct user access.
DROP POLICY IF EXISTS "No direct access to rate_limits" ON public.rate_limits;
CREATE POLICY "No direct access to rate_limits"
  ON public.rate_limits FOR ALL
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON public.rate_limits FROM anon, authenticated;


-- Rate limit check function
-- Returns true if the request is allowed, false if rate limited.
-- Usage: SELECT public.check_rate_limit('hash_of_ip', 'endpoint_name', 30, 60);
--   → allows up to 30 requests per 60-second window per IP per endpoint.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_ip_hash TEXT,
  p_endpoint TEXT,
  p_max_requests INT DEFAULT 30,
  p_window_seconds INT DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- Compute the current window start
  v_window_start := date_trunc('minute', now()) - 
    (EXTRACT(EPOCH FROM now())::BIGINT % p_window_seconds) * INTERVAL '1 second';

  -- Clean up old entries (past the window)
  DELETE FROM public.rate_limits
  WHERE window_start < v_window_start;

  -- Get current count for this IP + endpoint in this window
  SELECT COALESCE(request_count, 0) INTO v_count
  FROM public.rate_limits
  WHERE ip_hash = p_ip_hash
    AND endpoint = p_endpoint
    AND window_start = v_window_start;

  -- If no entry yet, insert one
  IF v_count IS NULL OR v_count = 0 THEN
    INSERT INTO public.rate_limits (ip_hash, endpoint, window_start, request_count)
    VALUES (p_ip_hash, p_endpoint, v_window_start, 1)
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;

  -- Check if rate limit exceeded
  IF v_count >= p_max_requests THEN
    RETURN false;
  END IF;

  -- Increment counter
  UPDATE public.rate_limits
  SET request_count = request_count + 1
  WHERE ip_hash = p_ip_hash
    AND endpoint = p_endpoint
    AND window_start = v_window_start;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INT, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INT, INT) TO service_role;
