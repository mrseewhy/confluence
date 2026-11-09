-- GLOBAL SEARCH: one call across notes, folders, and people.
--
-- Dashboard list pages each search their own table; this powers a single
-- command-palette style search. Access is scoped by the caller:
--   * notes/folders  -> only rows they own or can access (has_access_to_*)
--   * people         -> public_profiles only (no emails, no private data)
--
-- Returns a uniform shape so the client can render one list, with
-- `kind` telling it which icon/route to use.

create or replace function public.global_search(
  p_query text,
  p_limit int default 5
) returns table (
  kind        text,
  id          uuid,
  title       text,
  subtitle    text,
  slug        text,
  owner_username text,
  updated_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  q text;
  lim int;
begin
  if auth.uid() is null then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  q := btrim(coalesce(p_query, ''));
  if q = '' then
    return;
  end if;
  lim := least(greatest(coalesce(p_limit, 5), 1), 20);

  return query
  -- Notes the caller can read, matched on title/description/block text.
  select 'note'::text, n.id, n.title,
         coalesce(n.description, '')::text,
         n.slug, p.username,
         n.updated_at
  from public.notes n
  left join public.profiles p on p.id = n.owner_id
  where n.deleted_at is null
    and public.has_access_to_note(n.id, auth.uid())
    and (
      n.title ilike '%' || q || '%'
      or coalesce(n.description, '') ilike '%' || q || '%'
      or exists (
        select 1 from public.note_blocks b
        where b.note_id = n.id and b.content ilike '%' || q || '%'
      )
    )
  order by
    -- Title matches first, then recency.
    case when n.title ilike q || '%' then 0 else 1 end,
    n.updated_at desc
  limit lim;

  return query
  -- Folders the caller can read.
  select 'folder'::text, f.id, f.title,
         coalesce(f.description, '')::text,
         f.slug, p.username,
         f.updated_at
  from public.folders f
  left join public.profiles p on p.id = f.owner_id
  where
    public.has_access_to_folder(f.id, auth.uid())
    and (
      f.title ilike '%' || q || '%'
      or coalesce(f.description, '') ilike '%' || q || '%'
    )
  order by
    case when f.title ilike q || '%' then 0 else 1 end,
    f.updated_at desc
  limit lim;

  return query
  -- People. public_profiles only: no email, no private fields.
  select 'person'::text, pp.id, pp.full_name, ('@' || pp.username)::text,
         pp.username, pp.username,
         pp.created_at
  from public.public_profiles pp
  where pp.username ilike '%' || q || '%'
     or pp.full_name ilike '%' || q || '%'
  order by
    case when pp.username ilike q || '%' then 0 else 1 end,
    pp.full_name
  limit lim;
end;
$$;

revoke all on function public.global_search(text, int) from public;
revoke execute on function public.global_search(text, int) from anon;
grant execute on function public.global_search(text, int) to authenticated;
