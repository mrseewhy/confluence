-- ═════════════════════════════════════════════════════════════
-- ADMIN RPC FUNCTIONS — add p_user_type filter for server-side type filtering
-- ═════════════════════════════════════════════════════════════

-- RPC: admin_get_users — added p_user_type param
-- Drop all overloads of admin_get_users before re-creating
DO $$ BEGIN
  PERFORM public.admin_get_users(20, 0, NULL, NULL);
EXCEPTION WHEN OTHERS THEN
  -- ignore
END $$;

DROP FUNCTION IF EXISTS public.admin_get_users(integer, integer, text, text);
DROP FUNCTION IF EXISTS public.admin_get_users(integer, integer, text);
DROP FUNCTION IF EXISTS public.admin_get_users(integer, integer);

CREATE OR REPLACE FUNCTION public.admin_get_users(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_user_type text DEFAULT NULL
)
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
  WHERE (p_search IS NULL OR v._email ILIKE '%' || p_search || '%' OR v._name ILIKE '%' || p_search || '%')
    AND (p_user_type IS NULL OR v._type = p_user_type)
  ORDER BY v._created DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_users(integer, integer, text, text) TO authenticated;

-- RPC: admin_count_users — added p_user_type param
DROP FUNCTION IF EXISTS public.admin_count_users(text, text);
DROP FUNCTION IF EXISTS public.admin_count_users(text);
DROP FUNCTION IF EXISTS public.admin_count_users();
CREATE OR REPLACE FUNCTION public.admin_count_users(
  p_search text DEFAULT NULL,
  p_user_type text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  caller_id uuid;
  total_count integer;
BEGIN
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
    RETURN 0;
  END IF;

  SELECT COUNT(*)::integer INTO total_count
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE (p_search IS NULL OR u.email::text ILIKE '%' || p_search || '%' OR p.full_name ILIKE '%' || p_search || '%')
    AND (p_user_type IS NULL OR p.user_type::text = p_user_type);

  RETURN total_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_count_users(text, text) TO authenticated;
