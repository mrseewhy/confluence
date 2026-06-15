-- Note versions: snapshots of note content for revision history
create table if not exists public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  title text not null,
  description text,
  blocks jsonb not null,
  saved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_note_versions_note_id on public.note_versions(note_id);

alter table public.note_versions enable row level security;

create policy "note_versions_owner_select" on public.note_versions
  for select using (
    auth.uid() = (select owner_id from public.notes where id = note_id)
    or exists (select 1 from public.profiles where id = auth.uid() and user_type = 'admin')
  );

create policy "note_versions_owner_insert" on public.note_versions
  for insert with check (
    auth.uid() = (select owner_id from public.notes where id = note_id)
    or exists (select 1 from public.profiles where id = auth.uid() and user_type = 'admin')
  );

create policy "note_versions_admin_delete" on public.note_versions
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and user_type = 'admin')
  );

-- Save a snapshot of the current note state as a version
create or replace function public.save_note_version(
  p_note_id uuid,
  p_user_id uuid default auth.uid()
) returns uuid as $$
declare
  v_title text;
  v_description text;
  v_blocks jsonb;
  v_version_id uuid;
begin
  select title, description into v_title, v_description
  from public.notes where id = p_note_id;

  select jsonb_agg(
    jsonb_build_object(
      'type', type,
      'content', content,
      'order_index', order_index,
      'metadata', metadata
    ) order by order_index
  ) into v_blocks
  from public.note_blocks
  where note_id = p_note_id;

  insert into public.note_versions (note_id, title, description, blocks, saved_by)
  values (p_note_id, v_title, v_description, coalesce(v_blocks, '[]'::jsonb), p_user_id)
  returning id into v_version_id;

  return v_version_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.save_note_version(uuid, uuid) from anon;
grant execute on function public.save_note_version(uuid, uuid) to authenticated;

-- Get all versions for a note
create or replace function public.get_note_versions(p_note_id uuid)
returns table (
  id uuid,
  note_id uuid,
  title text,
  description text,
  saved_by uuid,
  saved_by_name text,
  created_at timestamptz
) as $$
begin
  return query
  select
    nv.id,
    nv.note_id,
    nv.title,
    nv.description,
    nv.saved_by,
    p.username as saved_by_name,
    nv.created_at
  from public.note_versions nv
  left join public.profiles p on p.id = nv.saved_by
  where nv.note_id = p_note_id
  order by nv.created_at desc;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.get_note_versions(uuid) from anon;
grant execute on function public.get_note_versions(uuid) to authenticated;

-- Restore a note to a previous version
create or replace function public.restore_note_version(p_version_id uuid, p_user_id uuid default auth.uid())
returns void as $$
declare
  v_note_id uuid;
  v_title text;
  v_description text;
  v_blocks jsonb;
  v_item jsonb;
begin
  select note_id, title, description, blocks into v_note_id, v_title, v_description, v_blocks
  from public.note_versions where id = p_version_id;

  if not found then
    raise exception 'Version not found';
  end if;

  update public.notes
  set title = v_title, description = v_description, updated_at = now()
  where id = v_note_id;

  delete from public.note_blocks where note_id = v_note_id;

  for v_item in select * from jsonb_array_elements(v_blocks)
  loop
    insert into public.note_blocks (note_id, type, content, order_index, metadata)
    values (
      v_note_id,
      v_item->>'type',
      v_item->>'content',
      (v_item->>'order_index')::int,
      (v_item->'metadata')::jsonb
    );
  end loop;

  perform public.save_note_version(v_note_id, p_user_id);
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.restore_note_version(uuid, uuid) from anon;
grant execute on function public.restore_note_version(uuid, uuid) to authenticated;

-- Get a single version's blocks for preview
create or replace function public.get_note_version_blocks(p_version_id uuid)
returns jsonb as $$
declare
  v_blocks jsonb;
  v_note_id uuid;
  v_caller_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return null;
  end if;

  select nv.blocks, nv.note_id into v_blocks, v_note_id
  from public.note_versions nv where nv.id = p_version_id;

  if v_note_id is null then
    return null;
  end if;

  if not exists (
    select 1 from public.notes n
    where n.id = v_note_id
      and (n.owner_id = v_caller_id or exists (
        select 1 from public.collaborators c
        where c.note_id = n.id and c.invitee_id = v_caller_id
      ))
  ) and not exists (
    select 1 from public.profiles where id = v_caller_id and user_type = 'admin'
  ) then
    return null;
  end if;

  return v_blocks;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.get_note_version_blocks(uuid) from anon;
grant execute on function public.get_note_version_blocks(uuid) to authenticated;
