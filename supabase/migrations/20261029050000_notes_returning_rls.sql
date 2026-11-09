-- FIX: note creation via INSERT ... RETURNING (PostgREST return=representation)
--
-- The notes SELECT policy relied solely on has_access_to_note(), a
-- SECURITY DEFINER helper that re-reads public.notes. During an INSERT
-- with RETURNING, the helper's separate query sees the pre-statement
-- snapshot, so the just-created row has no owner yet and the check
-- returns false -> the API answers 42501/403 and note creation fails.
--
-- Adding a direct `owner_id = auth.uid()` disjunct lets an owner read
-- their own row without the snapshot-bound helper, so RETURNING works.
-- Folders have the same shape and the same latent risk, so we fix both.

drop policy if exists "Notes are visible by policy" on public.notes;
create policy "Notes are visible by policy"
  on public.notes for select to authenticated
  using (owner_id = auth.uid() or public.has_access_to_note(id, auth.uid()));

drop policy if exists "Folders are visible by policy" on public.folders;
create policy "Folders are visible by policy"
  on public.folders for select to authenticated
  using (owner_id = auth.uid() or public.has_access_to_folder(id, auth.uid()));
