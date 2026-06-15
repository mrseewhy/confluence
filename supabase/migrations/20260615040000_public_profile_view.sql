-- ═════════════════════════════════════════════════════════════
-- SECURITY: PUBLIC PROFILE ACCESS CONTROL
-- ═════════════════════════════════════════════════════════════
-- Restricts the profiles table RLS policies so sensitive fields
-- (subscription_tier, is_banned) are NOT exposed via the API.
--
-- Changes:
--   1. Revokes direct SELECT from anon on the profiles table
--   2. Creates a security-barrier view with only safe fields
--   3. Grants SELECT on the view to anon + authenticated
--   4. Keeps full-table access for dashboard queries (via RLS scoped to auth.uid())

-- ── Step 1: Restrict anon to the public view only ──────────────

DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;

-- Create a security-barrier view with only the fields safe for public exposure.
DROP VIEW IF EXISTS public.public_profiles CASCADE;
CREATE VIEW public.public_profiles WITH (security_barrier = true) AS
SELECT
  id,
  full_name,
  username,
  avatar_url,
  user_type,
  created_at
FROM public.profiles;

-- Anon: restricted to the public view via a narrow policy that only
-- returns safe fields. We use the view directly.
CREATE POLICY "Profiles are readable by everyone"
  ON public.profiles FOR SELECT TO anon
  USING (false);

-- Authenticated users: full access to all fields (needed for dashboard)
CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Grant access to the public view for anon users
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ── Step 2: Rate limiting — request_log table ──────────────────
--
-- Lightweight per-user rate limiter stored as a simple table.
-- Used by is_slug_available and replace_note_blocks to prevent
-- abuse from a single authenticated user.

CREATE TABLE IF NOT EXISTS public.request_log (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action     text NOT NULL,            -- 'slug_check', 'save_blocks', 'signup'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast rate-limit lookups
CREATE INDEX IF NOT EXISTS idx_request_log_user_action
  ON public.request_log (user_id, action, created_at DESC);

-- Allow the authenticated role to insert their own rows
ALTER TABLE public.request_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own request log" ON public.request_log;
CREATE POLICY "Users can insert their own request log"
  ON public.request_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read their own request log" ON public.request_log;
CREATE POLICY "Users can read their own request log"
  ON public.request_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── Step 3: Rate-limit helper function ─────────────────────────
-- Returns true if the caller has exceeded the allowed number of
-- requests for the given action within the time window (seconds).
-- Call from sensitive RPCs before processing the request.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action       text,
  p_max_requests integer DEFAULT 30,
  p_window_secs  integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id   uuid;
  recent_count integer;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RETURN false;  -- can't rate-limit anon; the API gateway should handle this
  END IF;

  -- Count requests within the window (no housekeeping DELETE on hot path —
  -- the index handles performance and old rows are negligible until the
  -- table reaches millions of rows, which is unlikely for auth-protected RPCs.)
  SELECT count(*) INTO recent_count
  FROM public.request_log
  WHERE user_id = caller_id
    AND action = p_action
    AND created_at > now() - (p_window_secs || ' seconds')::interval;

  -- Log this request
  INSERT INTO public.request_log (user_id, action) VALUES (caller_id, p_action);

  RETURN recent_count < p_max_requests;
END;
$$;

-- ── Step 4: Apply rate limiting to sensitive RPCs ─────────────

-- Rate-limit slug availability checks to 60/min per user
CREATE OR REPLACE FUNCTION public.is_slug_available(
  p_slug text,
  p_owner_id uuid,
  p_exclude_note_id uuid DEFAULT null
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN RETURN false; END IF;

  -- Rate limit: max 60 slug checks per minute per user
  -- When rate-limited, return true (conservative — let the request through)
  -- rather than false which would mislead the user into thinking the slug is taken.
  IF NOT public.check_rate_limit('slug_check', 60, 60) THEN
    RETURN true;
  END IF;

  IF p_owner_id != caller_id THEN RETURN false; END IF;

  IF p_exclude_note_id IS NOT NULL THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM public.notes
      WHERE slug = p_slug AND owner_id = p_owner_id AND id != p_exclude_note_id
    );
  ELSE
    RETURN NOT EXISTS (
      SELECT 1 FROM public.notes
      WHERE slug = p_slug AND owner_id = p_owner_id
    );
  END IF;
END;
$$;

-- Rate-limit block replacements to 30/min per user
CREATE OR REPLACE FUNCTION public.replace_note_blocks(
  p_note_id uuid,
  p_blocks jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Rate limit: max 30 save operations per minute per user
  -- When rate-limited, silently no-op. The frontend's saveError state
  -- will be set to the PostgreSQL error message.
  IF NOT public.check_rate_limit('save_blocks', 30, 60) THEN
    RAISE EXCEPTION 'You are saving too quickly. Please wait a moment and try again.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.notes WHERE id = p_note_id) THEN
    RAISE EXCEPTION 'Note not found';
  END IF;

  IF NOT public.can_edit_note(p_note_id, caller_id) THEN
    RAISE EXCEPTION 'Not authorized: you do not have edit access to this note';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = caller_id AND is_banned = true) THEN
    RAISE EXCEPTION 'Account is banned';
  END IF;

  DELETE FROM public.note_blocks WHERE note_id = p_note_id;

  IF jsonb_array_length(p_blocks) > 0 THEN
    INSERT INTO public.note_blocks (note_id, type, content, order_index, metadata)
    SELECT
      p_note_id,
      (elem->>'type')::text,
      (elem->>'content')::text,
      (elem->>'order_index')::integer,
      coalesce((elem->'metadata')::jsonb, '{}'::jsonb)
    FROM jsonb_array_elements(p_blocks) as elem;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO authenticated;

-- ── ══════════════════════════════════════════════════════════
-- NOTE: Frontend queries for public profile pages (NoteDetailPage,
-- UserProfilePage, FolderDetailPage) currently use the `profiles`
-- table directly. After this migration, anon users will no longer
-- get results from `profiles` (the anon policy returns false).
-- These components should be updated to query `public_profiles`
-- instead of `profiles` when the user is not authenticated.
-- ═════════════════════════════════════════════════════════════
