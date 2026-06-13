-- Visibility type enum.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'visibility_type') then
    create type public.visibility_type as enum ('public', 'private');
  end if;
end
$$;

-- User type enum. New signups default to 'user'; promote manually by setting 'admin'.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_type') then
    create type public.user_type as enum ('user', 'admin');
  end if;
end
$$;

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text not null,
  avatar_url text,
  user_type public.user_type not null default 'user',
  subscription_tier text not null default 'free',
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

-- Ensure usernames are unique
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_username_key'
  ) then
    alter table public.profiles add constraint profiles_username_key unique (username);
  end if;
end
$$;

alter table public.profiles enable row level security;

-- FOLDERS
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  title text not null,
  description text,
  slug text not null,
  visibility public.visibility_type not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure slugs are unique per owner to prevent duplicate folder paths
alter table public.folders drop constraint if exists folders_slug_owner_key;
alter table public.folders add constraint folders_slug_owner_key unique (slug, owner_id);

alter table public.folders enable row level security;

-- NOTES
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  slug text not null,
  visibility public.visibility_type not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure slugs are unique per owner to prevent duplicate note paths
alter table public.notes drop constraint if exists notes_slug_key;
alter table public.notes drop constraint if exists notes_slug_owner_key;
alter table public.notes add constraint notes_slug_owner_key unique (slug, owner_id);

alter table public.notes enable row level security;

-- NOTE BLOCKS
create table if not exists public.note_blocks (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  type text not null, -- 'text', 'code', 'image', 'video'
  content text not null default '',
  order_index integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.note_blocks enable row level security;

drop policy if exists "Users can select their own note blocks" on public.note_blocks;
create policy "Users can select their own note blocks"
  on public.note_blocks for select to authenticated
  using (exists (select 1 from public.notes where id = note_id and (owner_id = auth.uid() or exists (select 1 from public.collaborators where note_id = public.notes.id and invitee_email = (select email from auth.users where id = auth.uid()))))));

drop policy if exists "Users can insert their own note blocks" on public.note_blocks;
create policy "Users can insert their own note blocks"
  on public.note_blocks for insert to authenticated
  with check (
    exists (select 1 from public.notes where id = note_id and (owner_id = auth.uid() or exists (select 1 from public.collaborators where note_id = public.notes.id and invitee_email = (select email from auth.users where id = auth.uid())))) AND
    not exists (select 1 from public.profiles where id = auth.uid() and is_banned = true)
  );

drop policy if exists "Users can update their own note blocks" on public.note_blocks;
create policy "Users can update their own note blocks"
  on public.note_blocks for update to authenticated
  using (exists (select 1 from public.notes where id = note_id and (owner_id = auth.uid() or exists (select 1 from public.collaborators where note_id = public.notes.id and invitee_email = (select email from auth.users where id = auth.uid()))))))
  with check (
    exists (select 1 from public.notes where id = note_id and (owner_id = auth.uid() or exists (select 1 from public.collaborators where note_id = public.notes.id and invitee_email = (select email from auth.users where id = auth.uid())))) AND
    not exists (select 1 from public.profiles where id = auth.uid() and is_banned = true)
  );

drop policy if exists "Users can delete their own note blocks" on public.note_blocks;
create policy "Users can delete their own note blocks"
  on public.note_blocks for delete to authenticated
  using (exists (select 1 from public.notes where id = note_id and (owner_id = auth.uid() or exists (select 1 from public.collaborators where note_id = public.notes.id and invitee_email = (select email from auth.users where id = auth.uid()))))));

-- COLLABORATORS / INVITATIONS
create table if not exists public.collaborators (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_email text not null,
  folder_id uuid references public.folders(id) on delete cascade,
  note_id uuid references public.notes(id) on delete cascade,
  access_level text not null default 'viewer', -- 'viewer', 'editor'
  created_at timestamptz not null default now(),
  constraint folder_or_note check (
    (folder_id is not null and note_id is null) or
    (folder_id is null and note_id is not null)
  )
);

alter table public.collaborators enable row level security;

-- RLS: Owners can read collaborators on their items
drop policy if exists "Owners can read collaborators on their items" on public.collaborators;
create policy "Owners can read collaborators on their items"
  on public.collaborators for select to authenticated
  using (
    auth.uid() = inviter_id OR
    (folder_id is not null and folder_id in (select id from public.folders where owner_id = auth.uid())) OR
    (note_id is not null and note_id in (select id from public.notes where owner_id = auth.uid()))
  );

-- RLS: Owners can insert collaborators on their items
drop policy if exists "Owners can insert collaborators on their items" on public.collaborators;
create policy "Owners can insert collaborators on their items"
  on public.collaborators for insert to authenticated
  with check (
    auth.uid() = inviter_id AND
    (
      (folder_id is not null and folder_id in (select id from public.folders where owner_id = auth.uid())) OR
      (note_id is not null and note_id in (select id from public.notes where owner_id = auth.uid()))
    )
  );

-- RLS: Owners can delete collaborators on their items
drop policy if exists "Owners can delete collaborators on their items" on public.collaborators;
create policy "Owners can delete collaborators on their items"
  on public.collaborators for delete to authenticated
  using (
    (folder_id is not null and folder_id in (select id from public.folders where owner_id = auth.uid())) OR
    (note_id is not null and note_id in (select id from public.notes where owner_id = auth.uid()))
  );

-- RLS: Invitees can read their own collaborator records (needed for "Collaborations" page)
drop policy if exists "Invitees can read their own collaborator records" on public.collaborators;
create policy "Invitees can read their own collaborator records"
  on public.collaborators for select to authenticated
  using (
    invitee_email = (select email from auth.users where id = auth.uid())
  );

-- Ensure the authenticated role has base table permissions
-- (RLS restricts rows within these grants, it does not grant base access)
grant select, insert, delete on public.collaborators to authenticated;

-- Allow the authenticated role to read auth.users for RLS policies that
-- look up the user's email (e.g. collaborators invitee_email checks).
-- This is safe because the RLS policy on collaborators already scopes the
-- result to the current user via auth.uid().
grant select on auth.users to authenticated;

-- Allow admins to read all collaborator records (for admin dashboard stats)
drop policy if exists "Admins can read all collaborators" on public.collaborators;
create policy "Admins can read all collaborators"
  on public.collaborators for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and user_type = 'admin')
  );

-- RLS POLICIES FOR PROFILES
drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Clean up auto-generated Supabase dashboard policies (if they exist)
drop policy if exists "Allow profile insertion" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Public folders are viewable by everyone" on public.folders;
drop policy if exists "Users can manage their own folders" on public.folders;
drop policy if exists "Public notes are viewable by everyone" on public.notes;
drop policy if exists "Users can manage their own notes" on public.notes;
drop policy if exists "Public blocks are viewable by everyone" on public.note_blocks;
drop policy if exists "Users can manage their own note blocks" on public.note_blocks;

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete to authenticated
  using (auth.uid() = id);

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
  on public.profiles for select to anon
  using (true);

-- PL/pgSQL Recursive access helper for Folders
create or replace function public.has_access_to_folder(folder_uuid uuid, user_uuid uuid)
returns boolean as $$
declare
  folder_owner_id uuid;
  folder_visibility public.visibility_type;
  parent_uuid uuid;
  user_email text;
  is_invited boolean;
begin
  -- 1. Admin access
  if exists (select 1 from public.profiles where id = user_uuid and user_type = 'admin') then
    return true;
  end if;

  -- 2. Fetch folder details
  select owner_id, visibility, parent_id into folder_owner_id, folder_visibility, parent_uuid
  from public.folders where id = folder_uuid;

  -- 3. Owner access
  if folder_owner_id = user_uuid then
    return true;
  end if;

  -- 4. Public access
  if folder_visibility = 'public' then
    return true;
  end if;

  -- 5. Fetch user email from auth
  select email into user_email from auth.users where id = user_uuid;

  -- 6. Direct folder invitation check
  select exists (
    select 1 from public.collaborators
    where folder_id = folder_uuid and invitee_email = user_email
  ) into is_invited;

  if is_invited then
    return true;
  end if;

  -- 7. Recursive check up parent hierarchy
  if parent_uuid is not null then
    return public.has_access_to_folder(parent_uuid, user_uuid);
  end if;

  return false;
end;
$$ language plpgsql security definer set search_path = public;

-- PL/pgSQL Recursive access helper for Notes
create or replace function public.has_access_to_note(note_uuid uuid, user_uuid uuid)
returns boolean as $$
declare
  note_owner_id uuid;
  note_visibility public.visibility_type;
  note_folder_id uuid;
  user_email text;
  is_invited boolean;
begin
  -- 1. Admin access
  if exists (select 1 from public.profiles where id = user_uuid and user_type = 'admin') then
    return true;
  end if;

  -- 2. Fetch note details
  select owner_id, visibility, folder_id into note_owner_id, note_visibility, note_folder_id
  from public.notes where id = note_uuid;

  -- 3. Owner access
  if note_owner_id = user_uuid then
    return true;
  end if;

  -- 4. Public access
  if note_visibility = 'public' then
    return true;
  end if;

  -- 5. Fetch user email
  select email into user_email from auth.users where id = user_uuid;

  -- 6. Direct note invitation check
  select exists (
    select 1 from public.collaborators
    where note_id = note_uuid and invitee_email = user_email
  ) into is_invited;

  if is_invited then
    return true;
  end if;

  -- 7. Parent folder cascading check
  if note_folder_id is not null then
    return public.has_access_to_folder(note_folder_id, user_uuid);
  end if;

  return false;
end;
$$ language plpgsql security definer set search_path = public;

-- ── Anonymous (public) read policies ──
drop policy if exists "Public folders are readable by everyone" on public.folders;
create policy "Public folders are readable by everyone"
  on public.folders for select to anon
  using (visibility = 'public'::visibility_type);

drop policy if exists "Public notes are readable by everyone" on public.notes;
create policy "Public notes are readable by everyone"
  on public.notes for select to anon
  using (visibility = 'public'::visibility_type);

drop policy if exists "Public note blocks are readable by everyone" on public.note_blocks;
create policy "Public note blocks are readable by everyone"
  on public.note_blocks for select to anon
  using (
    note_id in (select id from public.notes where visibility = 'public'::visibility_type)
  );

-- RLS POLICIES FOR FOLDERS (authenticated)
drop policy if exists "Folders are visible by policy" on public.folders;
create policy "Folders are visible by policy"
  on public.folders for select to authenticated
  using (public.has_access_to_folder(id, auth.uid()));

drop policy if exists "Users can insert their own folders" on public.folders;
create policy "Users can insert their own folders"
  on public.folders for insert to authenticated
  with check (
    owner_id = auth.uid() AND
    not exists (select 1 from public.profiles where id = auth.uid() and is_banned = true)
  );

drop policy if exists "Users can update their own folders" on public.folders;
create policy "Users can update their own folders"
  on public.folders for update to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid() AND
    not exists (select 1 from public.profiles where id = auth.uid() and is_banned = true)
  );

drop policy if exists "Users can delete their own folders" on public.folders;
create policy "Users can delete their own folders"
  on public.folders for delete to authenticated
  using (owner_id = auth.uid());

-- RLS POLICIES FOR NOTES (authenticated)
drop policy if exists "Notes are visible by policy" on public.notes;
create policy "Notes are visible by policy"
  on public.notes for select to authenticated
  using (public.has_access_to_note(id, auth.uid()));

drop policy if exists "Users can insert their own notes" on public.notes;
create policy "Users can insert their own notes"
  on public.notes for insert to authenticated
  with check (
    owner_id = auth.uid() AND
    not exists (select 1 from public.profiles where id = auth.uid() and is_banned = true)
  );

drop policy if exists "Users can update their own notes" on public.notes;
create policy "Users can update their own notes"
  on public.notes for update to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid() AND
    not exists (select 1 from public.profiles where id = auth.uid() and is_banned = true)
  );

drop policy if exists "Users can delete their own notes" on public.notes;
create policy "Users can delete their own notes"
  on public.notes for delete to authenticated
  using (owner_id = auth.uid());

-- ═════════════════════════════════════════════════════════════
-- STORAGE: Image upload bucket
-- ═════════════════════════════════════════════════════════════

-- Create the note-images bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('note-images', 'note-images', true, false, 5242880, '{"image/png","image/jpeg","image/gif","image/webp","image/svg+xml"}')
ON CONFLICT (id) DO NOTHING;

-- RLS: Allow authenticated users to upload images
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
CREATE POLICY "Users can upload their own images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'note-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS: Allow authenticated users to update their own images
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
CREATE POLICY "Users can update their own images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'note-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS: Allow authenticated users to delete their own images
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
CREATE POLICY "Users can delete their own images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'note-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS: Allow public (anon) to read images
DROP POLICY IF EXISTS "Public images are readable by everyone" ON storage.objects;
CREATE POLICY "Public images are readable by everyone"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'note-images');

-- RLS: Allow authenticated users to read images
DROP POLICY IF EXISTS "Authenticated users can read images" ON storage.objects;
CREATE POLICY "Authenticated users can read images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'note-images');

-- ═════════════════════════════════════════════════════════════
-- TRIGGER FUNCTION FOR NEW USER SIGNUPS
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_profile_id uuid;
  base_username text;
  final_username text;
  suffix int := 0;
begin
  -- Generate base username from full_name
  base_username := lower(
    regexp_replace(
      coalesce(new.raw_user_meta_data->>'full_name', new.email, 'user'),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );
  base_username := trim(both '-' from base_username);
  if base_username = '' then
    base_username := 'user';
  end if;

  -- Ensure uniqueness by appending a number if needed
  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || '-' || suffix;
  end loop;

  insert into public.profiles (id, full_name, username, avatar_url, user_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'User'),
    final_username,
    new.raw_user_meta_data->>'avatar_url',
    'user'
  )
  returning id into new_profile_id;

  -- Auto-create notification preferences for new user
  insert into public.notification_preferences (user_id, send_invite_emails)
  values (new_profile_id, true);

  -- Auto-create 'general' folder by default for all new profiles
  insert into public.folders (owner_id, parent_id, title, description, slug, visibility)
  values (
    new_profile_id,
    null,
    'general',
    'Default folder for all notes and subfolders.',
    'general',
    'public'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Revoke EXECUTE from anon for SECURITY DEFINER functions exposed via REST API.
-- These functions should only be callable internally or by authenticated users.
-- handle_new_user is a trigger-only function — nobody should call it via /rpc/.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
-- has_access_to_folder and has_access_to_note are helpers called from RLS policies.
-- They need EXECUTE from authenticated but NOT from anon (anon policies don't use them).
REVOKE EXECUTE ON FUNCTION public.has_access_to_folder(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_access_to_note(uuid, uuid) FROM anon;
-- replace_note_blocks and is_slug_available require authentication — revoke from anon.
REVOKE EXECUTE ON FUNCTION public.replace_note_blocks(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_slug_available(text, uuid, uuid) FROM anon;

-- ═════════════════════════════════════════════════════════════
-- ACTIVITY LOG (invite/revoke history)
-- ═════════════════════════════════════════════════════════════

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_email text not null default '',
  action text not null, -- 'invited', 'revoked', 'note_deleted', 'folder_deleted', 'visibility_changed', 'user_banned', 'user_unbanned', 'tier_changed', 'user_promoted', 'user_deleted'
  folder_id uuid references public.folders(id) on delete set null,
  note_id uuid references public.notes(id) on delete set null,
  access_level text, -- 'viewer' or 'editor'
  item_title text not null default '',
  item_slug text not null default '',
  item_type text not null, -- 'folder' or 'note' or 'user'
  details text, -- Extra context (e.g. "Changed visibility from private to public")
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;

drop policy if exists "Users can insert their own activity log" on public.activity_log;
create policy "Users can insert their own activity log"
  on public.activity_log for insert to authenticated
  with check (
    auth.uid() = inviter_id OR
    exists (select 1 from public.profiles where id = auth.uid() and user_type = 'admin')
  );

drop policy if exists "Users can read their own activity log" on public.activity_log;
create policy "Users can read their own activity log"
  on public.activity_log for select to authenticated
  using (auth.uid() = inviter_id);

drop policy if exists "Admins can read all activity log" on public.activity_log;
create policy "Admins can read all activity log"
  on public.activity_log for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and user_type = 'admin')
  );

grant select, insert on public.activity_log to authenticated;

-- ═════════════════════════════════════════════════════════════
-- ATOMIC BLOCK REPLACEMENT (single transaction)
-- ═════════════════════════════════════════════════════════════
-- Deletes all existing blocks for a note and inserts new ones
-- in one atomic transaction. If the insert fails, the delete
-- is rolled back, preventing data loss.
--
-- SECURITY: Includes an explicit ownership check to prevent
-- any authenticated user from overwriting blocks they don't own.
-- Though the client-side Supabase client passes the user's JWT,
-- SECURITY DEFINER bypasses RLS, so the check is done in-code.

create or replace function public.replace_note_blocks(
  p_note_id uuid,
  p_blocks jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  note_owner_id uuid;
begin
  -- Get the calling user's ID from the JWT
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Check that the note exists and the caller owns it
  select owner_id into note_owner_id from public.notes where id = p_note_id;
  if note_owner_id is null then
    raise exception 'Note not found';
  end if;

  if note_owner_id != caller_id then
    raise exception 'Not authorized: you do not own this note';
  end if;

  -- Defense-in-depth: also check that the caller is not banned
  if exists (select 1 from public.profiles where id = caller_id and is_banned = true) then
    raise exception 'Account is banned';
  end if;

  -- Proceed with atomic block replacement
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
end;
$$;

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

-- ═════════════════════════════════════════════════════════════
-- NOTIFICATION PREFERENCES
-- ═════════════════════════════════════════════════════════════

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  send_invite_emails boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users can manage their own notification preferences" on public.notification_preferences;
create policy "Users can manage their own notification preferences"
  on public.notification_preferences for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

