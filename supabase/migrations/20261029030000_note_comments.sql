-- ═════════════════════════════════════════════════════════════
-- NOTE COMMENTS
-- ═════════════════════════════════════════════════════════════
-- Threaded discussion attached to a note. Anyone who can read a
-- note (owner, public note, or collaborator) may read and post
-- comments. Authors can delete their own comments; note owners and
-- admins can delete any comment on their note.

create table if not exists public.note_comments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.note_comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_note_comments_note_created
  on public.note_comments (note_id, created_at);
create index if not exists idx_note_comments_parent
  on public.note_comments (parent_id);

alter table public.note_comments enable row level security;

-- Read: anyone who can read the note (public, owner, collaborator, admin).
drop policy if exists "Comments are readable with note access" on public.note_comments;
create policy "Comments are readable with note access"
  on public.note_comments for select to anon, authenticated
  using (public.has_access_to_note(note_id, auth.uid()));

-- Insert: authenticated users who can read the note and are not banned.
drop policy if exists "Users can comment on readable notes" on public.note_comments;
create policy "Users can comment on readable notes"
  on public.note_comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.has_access_to_note(note_id, auth.uid())
    and not exists (select 1 from public.profiles where id = auth.uid() and is_banned = true)
  );

-- Delete: the comment author, the note owner, or an admin.
drop policy if exists "Authors and note owners can delete comments" on public.note_comments;
create policy "Authors and note owners can delete comments"
  on public.note_comments for delete to authenticated
  using (
    author_id = auth.uid()
    or exists (select 1 from public.notes where id = note_id and owner_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and user_type = 'admin')
  );

grant select, insert, delete on public.note_comments to authenticated;
grant select on public.note_comments to anon;

-- Keep updated_at fresh on edits.
create or replace function public.touch_note_comment()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_note_comment on public.note_comments;
create trigger trg_touch_note_comment
  before update on public.note_comments
  for each row execute function public.touch_note_comment();
