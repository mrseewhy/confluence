-- New note media is private by default. The legacy note-images bucket also
-- contains profile avatars and remains public until those files are migrated.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('note-media', 'note-media', false, 5242880,
  '{"image/png","image/jpeg","image/gif","image/webp"}')
on conflict (id) do update set public = false;

create or replace function public.can_read_note_media(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select (auth.uid() is not null and split_part(p_name, '/', 1) = auth.uid()::text)
    or exists (
      select 1 from public.note_blocks b
      join public.notes n on n.id = b.note_id
      where b.type = 'image' and b.content = 'storage://note-media/' || p_name
        and n.deleted_at is null
        and (n.visibility = 'public'
          or (auth.uid() is not null and public.has_access_to_note(n.id, auth.uid())))
    );
$$;
revoke all on function public.can_read_note_media(text) from public;
grant execute on function public.can_read_note_media(text) to anon, authenticated;

create policy "Owners can upload note media" on storage.objects
for insert to authenticated
with check (bucket_id = 'note-media' and split_part(name, '/', 1) = auth.uid()::text);
create policy "Authorized readers can view note media" on storage.objects
for select to anon, authenticated
using (bucket_id = 'note-media' and public.can_read_note_media(name));
create policy "Owners can delete note media" on storage.objects
for delete to authenticated
using (bucket_id = 'note-media' and split_part(name, '/', 1) = auth.uid()::text);

-- Profile pictures are intentionally public and separate from note content.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880,
  '{"image/png","image/jpeg","image/gif","image/webp","image/svg+xml"}')
on conflict (id) do update set public = true;

create policy "Anyone can view avatars" on storage.objects
for select to anon, authenticated using (bucket_id = 'avatars');
create policy "Users can upload their avatar" on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);
create policy "Users can delete their avatar" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text);

-- Retire the shared legacy bucket only when it has no files or saved links.
-- This guard prevents accidental breakage if production content arrives later.
do $$ begin
  if exists (select 1 from storage.objects where bucket_id = 'note-images')
    or exists (select 1 from public.profiles
      where avatar_url like '%/storage/v1/object/public/note-images/%')
    or exists (select 1 from public.note_blocks
      where type = 'image' and content like '%/storage/v1/object/public/note-images/%')
    or exists (select 1 from public.note_versions
      where blocks::text like '%/storage/v1/object/public/note-images/%') then
    raise exception 'Legacy note-images bucket contains files or references; migrate them before locking it';
  end if;
end $$;

update storage.buckets set public = false where id = 'note-images';
drop policy if exists "Public images are readable by everyone" on storage.objects;
drop policy if exists "Authenticated users can read images" on storage.objects;
drop policy if exists "Users can upload their own images" on storage.objects;
drop policy if exists "Users can update their own images" on storage.objects;
drop policy if exists "Users can delete their own images" on storage.objects;
