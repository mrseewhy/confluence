-- Notifications table: in-app bell/badge for collaboration invites and activity
do $$ begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'collaborator_invite',
      'collaborator_revoked',
      'note_shared',
      'folder_shared',
      'ownership_transferred',
      'mention'
    );
  end if;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null default '',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_unread on public.notifications(user_id) where not read;

alter table public.notifications enable row level security;

create policy "notifications_owner_select" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_owner_update" on public.notifications
  for update using (auth.uid() = user_id);

create policy "notifications_system_insert" on public.notifications
  for insert with check (true);

-- Mark all as read
create or replace function public.mark_notifications_read(p_user_id uuid default auth.uid())
returns void as $$
begin
  update public.notifications
  set read = true
  where user_id = p_user_id and not read;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.mark_notifications_read(uuid) from anon;
grant execute on function public.mark_notifications_read(uuid) to authenticated;

-- Get unread count
create or replace function public.unread_notification_count(p_user_id uuid default auth.uid())
returns integer as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.notifications
  where user_id = p_user_id and not read;
  return v_count;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.unread_notification_count(uuid) from anon;
grant execute on function public.unread_notification_count(uuid) to authenticated;

-- Trigger: notify note owner when collaborator is added
create or replace function public.notify_collaborator_invite()
returns trigger as $$
declare
  v_owner_id uuid;
  v_note_title text;
  v_folder_title text;
begin
  -- Determine if this is a note or folder share
  if new.note_id is not null then
    select owner_id, title into v_owner_id, v_note_title
    from public.notes where id = new.note_id;

    insert into public.notifications (user_id, type, title, body, link)
    values (
      v_owner_id,
      'collaborator_invite',
      'New collaborator invited',
      new.invitee_email || ' was invited to note "' || v_note_title || '" as ' || new.access_level,
      '/dashboard/collaborators'
    );
  elsif new.folder_id is not null then
    select owner_id, title into v_owner_id, v_folder_title
    from public.folders where id = new.folder_id;

    insert into public.notifications (user_id, type, title, body, link)
    values (
      v_owner_id,
      'folder_shared',
      'Folder shared',
      new.invitee_email || ' was given access to folder "' || v_folder_title || '" as ' || new.access_level,
      '/dashboard/collaborators'
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_notify_collaborator_invite
  after insert on public.collaborators
  for each row execute function public.notify_collaborator_invite();
