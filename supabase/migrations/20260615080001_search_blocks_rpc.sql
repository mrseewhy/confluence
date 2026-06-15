-- RPC to search notes by title, description, AND block content
create or replace function public.search_notes_by_content(
  p_owner_id uuid,
  p_search text,
  p_visibility text default 'all',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  folder_id uuid,
  title text,
  description text,
  slug text,
  visibility visibility_type,
  sort_order bigint,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
) as $$
declare
  v_search_pattern text;
begin
  v_search_pattern := '%' || p_search || '%';

  return query
  select
    n.id, n.folder_id, n.title, n.description, n.slug, n.visibility, n.sort_order,
    n.created_at, n.updated_at,
    count(*) over() as total_count
  from public.notes n
  where n.owner_id = p_owner_id
    and n.deleted_at is null
    and (p_visibility = 'all' or n.visibility = p_visibility::visibility_type)
    and (
      n.title ilike v_search_pattern
      or n.description ilike v_search_pattern
      or exists (
        select 1 from public.note_blocks nb
        where nb.note_id = n.id
          and nb.content ilike v_search_pattern
      )
    )
  order by n.sort_order nulls last, n.updated_at desc
  limit p_limit
  offset p_offset;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.search_notes_by_content(uuid, text, text, int, int) from anon;
grant execute on function public.search_notes_by_content(uuid, text, text, int, int) to authenticated;
