-- ============================================================
-- 20260615070000: Notes sort_order + drag-to-reorder support
-- ============================================================

-- Add sort_order column to notes (default 0, incremented on creation)
alter table public.notes add column if not exists sort_order integer not null default 0;

-- Add index for efficient ordering by sort_order per owner
drop index if exists idx_notes_owner_sort_order;
create index idx_notes_owner_sort_order on public.notes (owner_id, sort_order asc);

-- Add index for efficient ordering by sort_order per folder
drop index if exists idx_notes_folder_sort_order;
create index idx_notes_folder_sort_order on public.notes (folder_id, sort_order asc);
