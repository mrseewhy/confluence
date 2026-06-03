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
  avatar_url text,
  user_type public.user_type not null default 'user',
  created_at timestamptz not null default now()
);

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
$$ language plpgsql security definer;

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
$$ language plpgsql security definer;

-- RLS POLICIES FOR FOLDERS
drop policy if exists "Folders are visible by policy" on public.folders;
create policy "Folders are visible by policy"
  on public.folders for select to authenticated
  using (public.has_access_to_folder(id, auth.uid()));

drop policy if exists "Users can manage their own folders" on public.folders;
create policy "Users can manage their own folders"
  on public.folders for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- RLS POLICIES FOR NOTES
drop policy if exists "Notes are visible by policy" on public.notes;
create policy "Notes are visible by policy"
  on public.notes for select to authenticated
  using (public.has_access_to_note(id, auth.uid()));

drop policy if exists "Users can manage their own notes" on public.notes;
create policy "Users can manage their own notes"
  on public.notes for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- TRIGGER FUNCTION FOR NEW USER SIGNUPS
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_profile_id uuid;
begin
  insert into public.profiles (id, full_name, avatar_url, user_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'User'),
    new.raw_user_meta_data->>'avatar_url',
    'user'
  )
  returning id into new_profile_id;

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
