-- Restrict privileged RPCs to the caller's own data.
create or replace function public.can_edit_note_version(p_note_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.notes n where n.id = p_note_id and (
      n.owner_id = auth.uid() or exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
      )
    )
  );
$$;
revoke all on function public.can_edit_note_version(uuid) from public;
grant execute on function public.can_edit_note_version(uuid) to authenticated;

create or replace function public.save_note_version(p_note_id uuid, p_user_id uuid default auth.uid())
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_user_id is distinct from auth.uid() or not public.can_edit_note_version(p_note_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  insert into public.note_versions(note_id, title, description, blocks, saved_by)
  select n.id, n.title, n.description,
    coalesce((select jsonb_agg(jsonb_build_object('type', b.type, 'content', b.content,
      'order_index', b.order_index, 'metadata', b.metadata) order by b.order_index)
      from public.note_blocks b where b.note_id = n.id), '[]'::jsonb), auth.uid()
  from public.notes n where n.id = p_note_id returning id into v_id;
  return v_id;
end; $$;

create or replace function public.mark_notifications_read(p_user_id uuid default auth.uid())
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  update public.notifications set read = true where user_id = auth.uid() and not read;
end; $$;

create or replace function public.unread_notification_count(p_user_id uuid default auth.uid())
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select count(*) into v_count from public.notifications where user_id = auth.uid() and not read;
  return v_count;
end; $$;

drop policy if exists "notifications_system_insert" on public.notifications;
revoke insert on public.notifications from anon, authenticated;

-- Searching a personal dashboard must never accept another owner's ID.
create or replace function public.search_notes_by_content(
  p_owner_id uuid, p_search text, p_visibility text default 'all',
  p_limit int default 20, p_offset int default 0
) returns table (
  id uuid, folder_id uuid, title text, description text, slug text,
  visibility public.visibility_type, sort_order bigint,
  created_at timestamptz, updated_at timestamptz, total_count bigint
) language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_owner_id is distinct from auth.uid() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return query
  select n.id, n.folder_id, n.title, n.description, n.slug, n.visibility,
    n.sort_order::bigint, n.created_at, n.updated_at, count(*) over()
  from public.notes n
  where n.owner_id = auth.uid() and n.deleted_at is null
    and (p_visibility = 'all' or n.visibility = p_visibility::public.visibility_type)
    and (n.title ilike '%' || p_search || '%'
      or n.description ilike '%' || p_search || '%'
      or exists (select 1 from public.note_blocks b where b.note_id = n.id
        and b.content ilike '%' || p_search || '%'))
  order by n.sort_order nulls last, n.updated_at desc
  limit least(greatest(p_limit, 0), 100) offset greatest(p_offset, 0);
end; $$;

-- Owners, admins and invited users may inspect history; only owners/admins restore.
create or replace function public.get_note_versions(p_note_id uuid)
returns table (
  id uuid, note_id uuid, title text, description text, saved_by uuid,
  saved_by_name text, created_at timestamptz
) language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.has_access_to_note(p_note_id, auth.uid()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return query
  select v.id, v.note_id, v.title, v.description, v.saved_by,
    p.username, v.created_at
  from public.note_versions v left join public.profiles p on p.id = v.saved_by
  where v.note_id = p_note_id order by v.created_at desc;
end; $$;

create or replace function public.restore_note_version(
  p_version_id uuid, p_user_id uuid default auth.uid()
) returns void language plpgsql security definer set search_path = public as $$
declare v_note_id uuid; v_title text; v_description text; v_blocks jsonb; v_item jsonb;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select v.note_id, v.title, v.description, v.blocks
  into v_note_id, v_title, v_description, v_blocks
  from public.note_versions v where v.id = p_version_id;
  if not found then raise exception 'Version not found'; end if;
  if not public.can_edit_note_version(v_note_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  update public.notes set title = v_title, description = v_description,
    updated_at = now() where id = v_note_id;
  delete from public.note_blocks where note_id = v_note_id;
  for v_item in select value from jsonb_array_elements(v_blocks) as value loop
    insert into public.note_blocks(note_id, type, content, order_index, metadata)
    values (v_note_id, v_item->>'type', v_item->>'content',
      (v_item->>'order_index')::int, v_item->'metadata');
  end loop;
  perform public.save_note_version(v_note_id, auth.uid());
end; $$;

-- Keep the preview endpoint aligned with the history listing permission.
create or replace function public.get_note_version_blocks(p_version_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_blocks jsonb; v_note_id uuid;
begin
  select v.blocks, v.note_id into v_blocks, v_note_id
  from public.note_versions v where v.id = p_version_id;
  if v_note_id is null or auth.uid() is null
    or not public.has_access_to_note(v_note_id, auth.uid()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return v_blocks;
end; $$;
