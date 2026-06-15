-- ═════════════════════════════════════════════════════════════
-- SLUG AVAILABILITY CHECK
-- ═════════════════════════════════════════════════════════════
-- Returns true if the given slug is not already taken by another
-- note owned by the same user. Pass p_exclude_note_id when
-- editing an existing note to exclude itself from the check.
--
-- SECURITY: Validates p_owner_id against the calling user's JWT
-- to prevent one user from enumerating slugs for another user.

create or replace function public.is_slug_available(
  p_slug text,
  p_owner_id uuid,
  p_exclude_note_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
begin
  -- Get the calling user's ID from the JWT
  caller_id := auth.uid();

  -- Reject unauthenticated calls
  if caller_id is null then
    return false;
  end if;

  -- Ensure the caller can only check slug availability for their own notes.
  -- This prevents one user from enumerating slugs owned by another user.
  if p_owner_id != caller_id then
    return false;
  end if;

  if p_exclude_note_id is not null then
    return not exists (
      select 1 from public.notes
      where slug = p_slug and owner_id = p_owner_id and id != p_exclude_note_id
    );
  else
    return not exists (
      select 1 from public.notes
      where slug = p_slug and owner_id = p_owner_id
    );
  end if;
end;
$$;

-- Revoke EXECUTE from anon — authenticated users only
REVOKE EXECUTE ON FUNCTION public.is_slug_available(text, uuid, uuid) FROM anon;
