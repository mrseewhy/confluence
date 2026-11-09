-- SECURITY: Restrict note_blocks writes to users with edit access.
--
-- The previous policies allowed ANY collaborator (including 'viewer')
-- to INSERT/UPDATE/DELETE blocks, bypassing the viewer/editor distinction
-- enforced on the notes table via can_edit_note(). A viewer could modify
-- note content directly through the Supabase client even though the UI
-- hides the editor.
--
-- Replace the write policies so they call public.can_edit_note(), which
-- returns true only for owners, editor collaborators, and admins.

drop policy if exists "Users can insert their own note blocks" on public.note_blocks;
create policy "Users can insert their own note blocks"
  on public.note_blocks for insert to authenticated
  with check (
    public.can_edit_note(note_id, auth.uid()) AND
    not exists (select 1 from public.profiles where id = auth.uid() and is_banned = true)
  );

drop policy if exists "Users can update their own note blocks" on public.note_blocks;
create policy "Users can update their own note blocks"
  on public.note_blocks for update to authenticated
  using (public.can_edit_note(note_id, auth.uid()))
  with check (
    public.can_edit_note(note_id, auth.uid()) AND
    not exists (select 1 from public.profiles where id = auth.uid() and is_banned = true)
  );

drop policy if exists "Users can delete their own note blocks" on public.note_blocks;
create policy "Users can delete their own note blocks"
  on public.note_blocks for delete to authenticated
  using (public.can_edit_note(note_id, auth.uid()));
