-- ═════════════════════════════════════════════════════════════
-- ADMIN RPC FUNCTIONS
-- Apply via: psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/admin-rpc.sql
-- After running: supabase start && psql ... -f supabase/seed-full.sql
-- ═════════════════════════════════════════════════════════════

-- RLS: Admins can update any profile (for ban/unban/tier/promote)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE user_type = 'admin')
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE user_type = 'admin')
  );

-- RLS: Admins can delete any profile
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE user_type = 'admin')
  );

-- RPC: admin_get_users — returns profiles joined with auth.users email
-- Uses current_setting instead of auth.uid() for reliable JWT claims access
DROP FUNCTION IF EXISTS public.admin_get_users();
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  user_id uuid,
  user_email text,
  user_full_name text,
  user_avatar_url text,
  user_type text,
  subscription_tier text,
  is_banned boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  caller_id uuid;
BEGIN
  -- Read JWT claims directly (more reliable than auth.uid() in SECURITY DEFINER context)
  BEGIN
    caller_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    caller_id := NULL;
  END;

  IF caller_id IS NULL THEN
    BEGIN
      caller_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      caller_id := NULL;
    END;
  END IF;

  -- Return empty if not an admin (don't RAISE — that causes 400 errors)
  IF caller_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = caller_id AND p.user_type = 'admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v._id,
    v._email,
    v._name,
    v._avatar,
    v._type,
    v._tier,
    v._banned,
    v._created
  FROM (
    SELECT
      p.id AS _id,
      u.email::text AS _email,
      p.full_name AS _name,
      p.avatar_url AS _avatar,
      p.user_type::text AS _type,
      p.subscription_tier AS _tier,
      p.is_banned AS _banned,
      p.created_at AS _created
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
  ) v
  ORDER BY v._created DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;

-- RPC: admin_change_password — updates a user's auth password
DROP FUNCTION IF EXISTS public.admin_change_password(uuid, text);
CREATE OR REPLACE FUNCTION public.admin_change_password(
  target_user_id uuid,
  new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  caller_id uuid;
BEGIN
  -- Get caller ID from JWT claims
  BEGIN
    caller_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    caller_id := NULL;
  END;
  IF caller_id IS NULL THEN
    BEGIN
      caller_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      caller_id := NULL;
    END;
  END IF;

  IF caller_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = caller_id AND p.user_type = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_change_password(uuid, text) TO authenticated;

-- RPC: admin_delete_user — deletes a user from auth.users (cascades)
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid);
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
BEGIN
  -- Get caller ID from JWT claims
  BEGIN
    caller_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    caller_id := NULL;
  END;
  IF caller_id IS NULL THEN
    BEGIN
      caller_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      caller_id := NULL;
    END;
  END IF;

  IF caller_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = caller_id AND p.user_type = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF target_user_id = caller_id THEN
    RAISE EXCEPTION 'Admins cannot delete themselves';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id AND user_type = 'admin') THEN
    RAISE EXCEPTION 'Cannot delete other admin users';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
