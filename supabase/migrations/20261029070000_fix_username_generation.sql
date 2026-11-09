-- FIX: generated usernames were losing the first letter of every word.
--
-- handle_new_user() lowercased AFTER the regexp_replace:
--
--   lower(regexp_replace(full_name, '[^a-z0-9]+', '-', 'g'))
--
-- In Postgres [^a-z0-9] is case sensitive, so mixed-case names had every
-- uppercase letter (i.e. the first letter of each word) replaced with '-'.
-- 'Sarah Chen' -> '-arah-hen' -> 'arah-hen'. Public URLs like
-- /sarah/n/<slug> then 404'd because the username no longer matched.
--
-- Lowercasing first makes the character class correct:
--   regexp_replace(lower(full_name), '[^a-z0-9]+', '-', 'g')
-- 'Sarah Chen' -> 'sarah-chen'.
--
-- This also repairs existing rows, unless the corrected username is
-- already taken (then the row is left alone and reported by the DO block).

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
  -- Generate base username from full_name (lowercase BEFORE stripping,
  -- so uppercase letters are not treated as separators).
  base_username := regexp_replace(
    lower(coalesce(new.raw_user_meta_data->>'full_name', new.email, 'user')),
    '[^a-z0-9]+',
    '-',
    'g'
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

  new_profile_id := new.id;

  insert into public.profiles (id, full_name, username, avatar_url, user_type)
  values (
    new_profile_id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'User'),
    final_username,
    new.raw_user_meta_data->>'avatar_url',
    'user'
  );

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

-- Backfill: recompute usernames that were mangled by the old logic.
-- Only touches rows whose full_name actually contains uppercase letters,
-- and skips any corrected username that would collide.
do $$
declare
  r record;
  candidate text;
  n int := 0;
begin
  for r in
    select p.id, p.full_name, p.username
    from public.profiles p
    where p.full_name ~ '[A-Z]'
  loop
    candidate := trim(both '-' from regexp_replace(lower(r.full_name), '[^a-z0-9]+', '-', 'g'));
    if candidate = '' then
      continue;
    end if;
    -- Skip if unchanged, or if the corrected name is taken by another profile.
    if candidate <> r.username
       and not exists (select 1 from public.profiles where username = candidate) then
      update public.profiles set username = candidate where id = r.id;
      n := n + 1;
    end if;
  end loop;
  raise notice 'handle_new_user backfill: renamed % profiles', n;
end;
$$;
