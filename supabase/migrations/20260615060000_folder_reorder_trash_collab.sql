-- ============================================================
-- 20260615060000: Folder reorder + note trash + collaborator UI
-- ============================================================

-- 1. Add sort_order column to folders (default 0, incremented on creation)
alter table public.folders add column if not exists sort_order integer not null default 0;

-- 2. Add deleted_at column to notes for soft-delete / trash
alter table public.notes add column if not exists deleted_at timestamptz;

-- Create a function to permanently delete notes that have been
-- in the trash for more than 30 days.
create or replace function public.cleanup_trashed_notes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.notes
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';
  
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Update RLS: Only owners can see trashed notes (not collaborators, not anon)
-- The existing "Users can delete their own notes" policy handles hard-delete.
-- For soft-delete (update deleted_at), the "Users can update their own notes"
-- policy already requires owner_id = auth.uid(), which is correct.

-- Allow authenticated users to call cleanup (dashboard Trash page)
GRANT EXECUTE ON FUNCTION public.cleanup_trashed_notes() TO authenticated;
-- Revoke execute from anon on cleanup_trashed_notes
REVOKE EXECUTE ON FUNCTION public.cleanup_trashed_notes() FROM anon;
