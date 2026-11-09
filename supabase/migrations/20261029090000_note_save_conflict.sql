-- OPTIMISTIC CONCURRENCY for note saves.
--
-- Two people editing the same note previously raced: whichever save landed
-- last silently won, clobbering the other person's work with no warning.
--
-- replace_note_blocks_checked() takes the updated_at the caller last saw.
-- If the row has moved on, it raises a distinguishable error (code P0001
-- with a machine-readable message 'version_conflict') so the client can
-- surface a conflict instead of overwriting.
--
-- Passing p_expected_updated_at = null keeps the old last-write-wins
-- behaviour, for callers that do not track versions.

create or replace function public.replace_note_blocks_checked(
  p_note_id uuid,
  p_blocks jsonb,
  p_expected_updated_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  current_updated_at timestamptz;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.notes where id = p_note_id) then
    raise exception 'Note not found' using errcode = 'P0002';
  end if;

  if not public.can_edit_note(p_note_id, caller_id) then
    raise exception 'Not authorized: you do not have edit access to this note'
      using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = caller_id and is_banned = true) then
    raise exception 'Account is banned' using errcode = '42501';
  end if;

  -- Compare-and-swap on updated_at.
  if p_expected_updated_at is not null then
    select updated_at into current_updated_at
    from public.notes where id = p_note_id;

    if current_updated_at is distinct from p_expected_updated_at then
      raise exception 'version_conflict' using errcode = 'P0001';
    end if;
  end if;

  delete from public.note_blocks where note_id = p_note_id;

  if jsonb_array_length(p_blocks) > 0 then
    insert into public.note_blocks (note_id, type, content, order_index, metadata)
    select
      p_note_id,
      (elem->>'type')::text,
      (elem->>'content')::text,
      (elem->>'order_index')::integer,
      coalesce((elem->'metadata')::jsonb, '{}'::jsonb)
    from jsonb_array_elements(p_blocks) as elem;
  end if;

  -- Bump the version stamp so the next save can detect a stale client.
  update public.notes set updated_at = now() where id = p_note_id;
end;
$$;

revoke all on function public.replace_note_blocks_checked(uuid, jsonb, timestamptz) from public;
revoke execute on function public.replace_note_blocks_checked(uuid, jsonb, timestamptz) from anon;
grant execute on function public.replace_note_blocks_checked(uuid, jsonb, timestamptz) to authenticated;
