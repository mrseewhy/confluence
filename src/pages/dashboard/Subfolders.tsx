import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Button, EmptyState, Input, Badge } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { ShareModal } from "@/components/ShareModal";
import { formatDate, buildSlug } from "@/lib/helpers";
import { Modal } from "@/components/Modal";
import styles from "@/styles/dashboard.module.css";
import { safeStr, safeArray } from "@/lib/safeParse";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { PaginationBar } from "@/components/PaginationBar";
import type { Folder, Visibility } from "@/types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubfolderRow extends Folder {
  parentTitle: string;
  parentSlug: string;
  derivedNoteCount: number;
  depth: number;
}

// ---------------------------------------------------------------------------
// Sortable row wrapper
// ---------------------------------------------------------------------------

function SortableSubfolderRow({
  subfolder,
  isDragOverlay,
  onKeyMove,
  children,
}: {
  subfolder: { id: string; sort_order?: number; title?: string };
  isDragOverlay?: boolean;
  onKeyMove?: (id: string, direction: 'up' | 'down') => void;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subfolder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 100 : 1,
    boxShadow: isDragOverlay
      ? "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)"
      : "none",
    scale: isDragOverlay ? 1.03 : 1,
    transformOrigin: "center" as const,
    borderRadius: isDragOverlay ? "var(--radius-lg)" : undefined,
    overflow: "hidden" as const,
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onKeyMove?.(subfolder.id, 'up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onKeyMove?.(subfolder.id, 'down');
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.tableRow} ${styles.cols6_Subfolders}`}
      onKeyDown={isDragOverlay ? undefined : handleKeyDown}
      aria-label={`${isDragOverlay ? '' : 'Drag to reorder. Press Alt+ArrowUp or Alt+ArrowDown to move. '}${subfolder.title || ''}`}
      {...attributes}
      {...(isDragOverlay ? {} : listeners)}
    >
      {children}
      {/* Drag handle */}
      {!isDragOverlay && (
        <div
          {...listeners}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "grab",
            color: "var(--color-text-muted)",
            fontSize: "14px",
            userSelect: "none",
            touchAction: "none",
            transition: "color 0.15s ease",
          }}
          className="drag-handle"
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
          title="Drag to reorder · Alt+↑↓ to move"
        >
          ⠿
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_VISIBILITY: Visibility = "public";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SubfolderDragOverlay({ subfolder }: { subfolder: SubfolderRow }) {
  return (
    <SortableSubfolderRow subfolder={subfolder} isDragOverlay>
      <div style={{ gridColumn: "2 / -1", display: "contents" }}>
        <div className={styles.cellFlex}>
          <div className={styles.iconBadge} style={{ background: "var(--color-bg-muted)", color: "var(--color-text-secondary)" }}>
            <Icon d={IC.subfolder} size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)" }}>
              {subfolder.title}
            </span>
            {subfolder.description && (
              <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                {subfolder.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </SortableSubfolderRow>
  );
}

export function DashboardSubfolders() {
  const { profile } = useAuth();
  const user = profile;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subfoldersData, setSubfoldersData] = useState<SubfolderRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [allFolders, setAllFolders] = useState<Pick<Folder, "id" | "title" | "parent_id">[]>([]);

  const flatFolders = useMemo(() => {
    type FlatFolder = { id: string; title: string; depth: number; parent_id: string | null };
    const roots = allFolders.filter((f) => !f.parent_id);
    const result: FlatFolder[] = [];

    const addChildren = (parentId: string, depth: number) => {
      const children = allFolders.filter((f) => f.parent_id === parentId);
      for (const child of children) {
        result.push({ id: child.id, title: child.title, parent_id: child.parent_id, depth });
        addChildren(child.id, depth + 1);
      }
    };

    for (const root of roots) {
      result.push({ id: root.id, title: root.title, parent_id: root.parent_id, depth: 0 });
      addChildren(root.id, 1);
    }

    return result;
  }, [allFolders]);

  const [shareItem, setShareItem] = useState<Folder | null>(null);

  // Pagination
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  // Debounce search — replaces manual useState + useEffect pattern
  const { search, setSearch, debouncedSearch } = useDebouncedSearch({ onSearchChange: () => setPage(1) });

  // Creation state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [parentId, setParentId] = useState("");
  const [newVisibility, setNewVisibility] =
    useState<Visibility>(DEFAULT_VISIBILITY);

  // Edit state
  const [editFolder, setEditFolder] = useState<Folder | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editVisibility, setEditVisibility] = useState<Visibility>(DEFAULT_VISIBILITY);
  const [editing, setEditing] = useState(false);

  // Collect IDs to exclude from parent picker when editing (folder + its descendants)
  const editExcludeIds = useMemo(() => {
    if (!editFolder) return new Set<string>();
    const ids = new Set<string>();
    const collect = (parentId: string) => {
      ids.add(parentId);
      for (const f of allFolders) {
        if (f.parent_id === parentId) collect(f.id);
      }
    };
    collect(editFolder.id);
    return ids;
  }, [editFolder, allFolders]);

  // Delete confirmation state
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Drag overlay state
  const [activeDragSubfolder, setActiveDragSubfolder] = useState<SubfolderRow | null>(null);
  const [reorderAnnounce, setReorderAnnounce] = useState("");

  // Clear ARIA announcement after 3 seconds
  useEffect(() => {
    if (!reorderAnnounce) return
    const t = setTimeout(() => setReorderAnnounce(""), 3000)
    return () => clearTimeout(t)
  }, [reorderAnnounce])

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  // ---------------------------------------------------------------------------
  // Data loading — server-side pagination with range
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async (currentSearch: string, currentPage: number) => {
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = requireSupabase();

      // Fetch all folders for the parent select dropdown (shows hierarchy)
      const { data: all } = await supabase
        .from("folders")
        .select("id, title, parent_id")
        .eq("owner_id", user.id)
        .order("title");
      setAllFolders(safeArray(all) as Pick<Folder, "id" | "title" | "parent_id">[]);

      // Count subfolders matching search
      let countQuery = supabase
        .from("folders")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .not("parent_id", "is", null);
      if (currentSearch) {
        countQuery = countQuery.or(`title.ilike.%${currentSearch}%,description.ilike.%${currentSearch}%`);
      }
      const { count } = await countQuery;
      setTotalCount(count ?? 0);

      // Fetch paginated subfolders with parent info
      const from = (currentPage - 1) * PAGE_SIZE;
      let query = supabase
        .from("folders")
        .select("*, parent:folders!parent_id(id, title, slug)")
        .eq("owner_id", user.id)
        .not("parent_id", "is", null)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (currentSearch) {
        query = query.or(`title.ilike.%${currentSearch}%,description.ilike.%${currentSearch}%`);
      }
      const { data: subfoldersRaw } = await query;

      // Fetch notes counts for the returned subfolders
      const sfIds = (subfoldersRaw || []).map((sf: { id: string }) => sf.id);
      const noteCounts: Record<string, number> = {};
      if (sfIds.length > 0) {
        const { data: notesData } = await supabase
          .from("notes")
          .select("folder_id")
          .in("folder_id", sfIds);
        (notesData || []).forEach((n: { folder_id: string }) => {
          noteCounts[n.folder_id] = (noteCounts[n.folder_id] || 0) + 1;
        });
      }

      const safeRaw = safeArray<Record<string, unknown>>(subfoldersRaw);
      const folderData = safeArray(all) as { id: string; parent_id: string | null }[];
      const getDepth = (id: string, visited = new Set<string>()): number => {
        if (visited.has(id)) return 0; // circular safety
        visited.add(id);
        const f = folderData.find((a) => a.id === id);
        if (!f || !f.parent_id) return 1;
        return 1 + getDepth(f.parent_id, visited);
      };
      const mapped: SubfolderRow[] = safeRaw.map((sf) => {
        const parent = safeArray<Record<string, unknown>>(sf.parent).length > 0
          ? safeArray<Record<string, unknown>>(sf.parent)[0]
          : null;
        const sfId = safeStr(sf.id);
        return {
          id: sfId,
          owner_id: safeStr(sf.owner_id),
          title: safeStr(sf.title),
          description: safeStr(sf.description) || null,
          slug: safeStr(sf.slug),
          visibility: safeStr(sf.visibility) as Visibility,
          parent_id: safeStr(sf.parent_id) || null,
          created_at: safeStr(sf.created_at),
          updated_at: safeStr(sf.updated_at),
          parentTitle: parent ? safeStr(parent.title, "Unknown Parent") : "Unknown Parent",
          parentSlug: parent ? safeStr(parent.slug) : "",
          derivedNoteCount: noteCounts[sfId] || 0,
          depth: getDepth(sfId),
        };
      });

      setSubfoldersData(mapped);
    } catch {
      setError("Failed to load subfolders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadData(debouncedSearch, page); }, [page, debouncedSearch, loadData]);

  // ---------------------------------------------------------------------------
  // No more client-side filtering — server handles it
  // ---------------------------------------------------------------------------

  const totalFiltered = totalCount;
  const paginated = subfoldersData;

  // ---------------------------------------------------------------------------
  // Modal helpers
  // ---------------------------------------------------------------------------

  const resetAndClose = useCallback(() => {
    setIsCreateOpen(false);
    setNewTitle("");
    setNewDesc("");
    setParentId("");
    setNewVisibility(DEFAULT_VISIBILITY);
  }, []);

  // ---------------------------------------------------------------------------
  // CRUD handlers
  // ---------------------------------------------------------------------------

  const handleCreateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !parentId || !user) return;

    if (user.is_banned) {
      addToast("Account is banned — cannot create subfolders.", "error");
      return;
    }

    const slug = buildSlug(newTitle);

    try {
      const supabase = requireSupabase();
      // Get the current max sort_order for this user's subfolders
      const { data: maxOrder } = await supabase
        .from("folders")
        .select("sort_order")
        .eq("owner_id", user.id)
        .not("parent_id", "is", null)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = (maxOrder?.[0]?.sort_order ?? -1) + 1;

      const { error: insertErr } = await supabase.from("folders").insert({
        owner_id: user.id,
        parent_id: parentId,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        slug,
        visibility: newVisibility,
        sort_order: nextOrder,
      });

      if (insertErr) throw insertErr;

      await loadData(debouncedSearch, page);
      resetAndClose();
      addToast("Subfolder created successfully", "success");
    } catch (err: unknown) {
      const pgErr = err && typeof err === "object" ? (err as Record<string, unknown>) : null;
      const msg =
        safeStr(pgErr?.code) === "23505"
          ? "A subfolder with this title already exists. Please choose a different name."
          : "Failed to create subfolder. Please try again.";
      setError(msg);
    }
  };

  const handleEditSubfolder = (sf: SubfolderRow) => {
    setEditFolder(sf as unknown as Folder);
    setEditTitle(sf.title);
    setEditDesc(sf.description || "");
    setEditParentId(sf.parent_id || "");
    setEditVisibility(sf.visibility);
  };

  const handleUpdateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editFolder || !user) return;
    setEditing(true);

    try {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("folders")
        .update({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          parent_id: editParentId || null,
          visibility: editVisibility,
        })
        .eq("id", editFolder.id);

      if (error) throw error;

      await loadData(debouncedSearch, page);
      setEditFolder(null);
      addToast("Subfolder updated successfully", "success");
    } catch {
      setError("Failed to update subfolder. Please try again.");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteSubfolder = async (id: string) => {
    try {
      const supabase = requireSupabase();

      // Save subfolder data before deleting for undo
      const { data: sfToDelete, error: fetchErr } = await supabase
        .from("folders")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchErr) throw fetchErr;

      const { error: deleteErr } = await supabase
        .from("folders")
        .delete()
        .eq("id", id);
      if (deleteErr) throw deleteErr;

      await loadData(debouncedSearch, page);
      addToast("Subfolder deleted", "success", {
        label: "Undo",
        onClick: async () => {
          if (!sfToDelete) return;
          const undoData = { ...sfToDelete };
          // If slug is taken, append timestamp to avoid conflicts
          const { data: existing } = await supabase
            .from("folders")
            .select("id")
            .eq("slug", undoData.slug)
            .maybeSingle();
          if (existing) {
            undoData.slug = `${undoData.slug}-${Date.now()}`;
          }
          const { error: insertErr } = await supabase.from("folders").insert(undoData);
          if (insertErr) {
            addToast("Failed to undo deletion. Try again.", "error");
            return;
          }
          await loadData(debouncedSearch, page);
        },
      });
    } catch {
      setError("Failed to delete subfolder. Please try again.");
    } finally {
      setPendingDeleteId(null);
    }
  };

  // ── Drag-to-reorder handler ────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const dragged = paginated.find((sf) => sf.id === event.active.id);
    if (dragged) setActiveDragSubfolder(dragged);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragSubfolder(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    try {
      const supabase = requireSupabase();

      const sorted = [...paginated].map((f, i) => ({ ...f, _idx: i }));

      const oldIndex = sorted.findIndex((f) => f.id === active.id);
      const newIndex = sorted.findIndex((f) => f.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      // Save original order for undo
      const originalOrders = sorted.map((item) => ({
        id: item.id,
        sort_order: item.sort_order,
      }));

      // Reorder the array
      const reordered = [...sorted];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      // Batch update sort_order for all affected items
      const updates = reordered.map((item, i) => ({
        id: item.id,
        sort_order: i,
      }));

      await Promise.all(
        updates.map((update) =>
          supabase
            .from("folders")
            .update({ sort_order: update.sort_order })
            .eq("id", update.id),
        ),
      );

      await loadData(debouncedSearch, page);
      setReorderAnnounce("Subfolders reordered")
      addToast("Subfolders reordered", "success", {
        label: "Undo",
        onClick: async () => {
          await Promise.all(
            originalOrders.map((orig) =>
              supabase.from("folders").update({ sort_order: orig.sort_order }).eq("id", orig.id),
            ),
          );
          await loadData(debouncedSearch, page);
        },
      });
    } catch {
      addToast("Failed to reorder. Try again.", "error");
    }
  };

  // ── Keyboard reorder handler ─────────────────────────────

  const handleKeyboardMove = async (id: string, direction: 'up' | 'down') => {
    try {
      const supabase = requireSupabase();
      const sorted = [...paginated];
      const idx = sorted.findIndex((sf) => sf.id === id);
      if (idx === -1) return;

      if (direction === 'up' && idx > 0) {
        const current = sorted[idx];
        const above = sorted[idx - 1];
        const origCurrent = { id: current.id, sort_order: current.sort_order };
        const origAbove = { id: above.id, sort_order: above.sort_order };
        await supabase.from("folders").update({ sort_order: above.sort_order }).eq("id", current.id);
        await supabase.from("folders").update({ sort_order: current.sort_order }).eq("id", above.id);
        await loadData(debouncedSearch, page);
        setReorderAnnounce("Subfolder moved up")
        addToast("Subfolder moved", "success", {
          label: "Undo",
          onClick: async () => {
            await supabase.from("folders").update({ sort_order: origCurrent.sort_order }).eq("id", origCurrent.id);
            await supabase.from("folders").update({ sort_order: origAbove.sort_order }).eq("id", origAbove.id);
            await loadData(debouncedSearch, page);
          },
        });
      } else if (direction === 'down' && idx < sorted.length - 1) {
        const current = sorted[idx];
        const below = sorted[idx + 1];
        const origCurrent = { id: current.id, sort_order: current.sort_order };
        const origBelow = { id: below.id, sort_order: below.sort_order };
        await supabase.from("folders").update({ sort_order: below.sort_order }).eq("id", current.id);
        await supabase.from("folders").update({ sort_order: current.sort_order }).eq("id", below.id);
        await loadData(debouncedSearch, page);
        setReorderAnnounce("Subfolder moved down")
        addToast("Subfolder moved", "success", {
          label: "Undo",
          onClick: async () => {
            await supabase.from("folders").update({ sort_order: origCurrent.sort_order }).eq("id", origCurrent.id);
            await supabase.from("folders").update({ sort_order: origBelow.sort_order }).eq("id", origBelow.id);
            await loadData(debouncedSearch, page);
          },
        });
      }
    } catch {
      addToast("Failed to reorder. Try again.", "error");
    }
  };

  // ---------------------------------------------------------------------------
  // Render — loading / auth guard
  // ---------------------------------------------------------------------------

  if (!user || loading) {
    return (
      <DashboardLayout
        user={
          user ?? fallbackProfile()
        }
        variant="user"
      >
        <div className={styles.loadingState}>
          Loading subfolders…
        </div>
      </DashboardLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — main
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout user={user} variant="user">
      {/* Error banner */}
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: "var(--space-4)",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--color-danger-subtle)",
            border: "1px solid var(--color-danger)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-danger)",
            fontSize: "var(--font-size-sm)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              fontSize: "var(--font-size-base)",
              lineHeight: 1,
            }}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.headerTitle}>
            Subfolders
          </h1>
          <p className={styles.headerSubtitle}>
            {totalCount} subfolder
            {totalCount !== 1 ? "s" : ""} across all folders
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Icon d={IC.plus} size={14} />}
        >
          New subfolder
        </Button>
      </div>

      {/* Search */}
      <div className={styles.filterRow}>
        <input
          type="search"
          placeholder="Search subfolders or parent folder…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          style={{ maxWidth: "400px" }}
          aria-label="Search subfolders"
        />
      </div>

      {/* Table */}
      {paginated.length > 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader} style={{ gridTemplateColumns: "24px 1fr 180px 80px 100px 120px 140px" }}>
            {[
              "",
              "Subfolder",
              "Parent folder",
              "Notes",
              "Visibility",
              "Updated",
              "Actions",
            ].map((h) => (
              <span className={styles.tableHeaderCell}>{h}</span>
            ))}
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={paginated.map((sf) => sf.id)}
              strategy={verticalListSortingStrategy}
            >
              {paginated.map((sf) => (
                <SortableSubfolderRow key={sf.id} subfolder={sf} onKeyMove={handleKeyboardMove}>
                  <div style={{ gridColumn: "2 / -1", display: "contents" }}>
                    {/* Title + description */}
                    <div className={styles.cellFlex}>
                      <div className={styles.iconBadge} style={{ background: "var(--color-bg-muted)", color: "var(--color-text-secondary)" }}>
                        <Icon d={IC.subfolder} size={16} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <a
                          href={`/${user?.username || "u"}/folder/${sf.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            margin: 0,
                            fontSize: "var(--font-size-sm)",
                            fontWeight: "var(--font-weight-semibold)",
                            color: "var(--color-text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textDecoration: "none",
                            display: "block",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                        >
                          {sf.title}
                          {sf.depth > 1 && (
                            <span style={{
                              marginLeft: "6px",
                              fontSize: "10px",
                              color: "var(--color-text-muted)",
                              background: "var(--color-bg-muted)",
                              padding: "0 6px",
                              borderRadius: "var(--radius-sm)",
                              verticalAlign: "middle",
                            }}>
                              Lv.{sf.depth}
                            </span>
                          )}
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              marginLeft: "4px",
                              opacity: 0.3,
                              verticalAlign: "middle",
                              display: "inline",
                            }}
                          >
                            <path d="M7 17l9.2-9.2M17 17V7H7" />
                          </svg>
                        </a>
                        {sf.description && (
                          <p
                            style={{
                              margin: 0,
                              fontSize: "var(--font-size-xs)",
                              color: "var(--color-text-muted)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {sf.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Parent folder (clickable) */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                      }}
                    >
                      <Icon d={IC.folder} size={13} />
                      {sf.parentSlug ? (
                        <a
                          href={`/${user?.username || "u"}/folder/${sf.parentSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: "var(--font-size-xs)",
                            color: "var(--color-accent)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textDecoration: "none",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                        >
                          {sf.parentTitle}
                        </a>
                      ) : (
                        <span
                          style={{
                            fontSize: "var(--font-size-xs)",
                            color: "var(--color-text-secondary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {sf.parentTitle}
                        </span>
                      )}
                    </div>

                    {/* Note count */}
                    <span
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {sf.derivedNoteCount}
                    </span>

                    {/* Visibility */}
                    <Badge variant={sf.visibility === "public" ? "accent" : "muted"}>
                      {sf.visibility}
                    </Badge>

                    {/* Updated date */}
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {formatDate(sf.updated_at)}
                    </span>

                    {/* Actions */}
                    <div className={styles.cellActions}>
                      <Button
                        variant="accent-ghost"
                        size="xs"
                        onClick={() => handleEditSubfolder(sf)}
                      >
                        Edit
                      </Button>
                      {/* Share is shown for PRIVATE folders (to invite collaborators) */}
                      {sf.visibility === "private" && (
                        <Button
                          variant="accent-ghost"
                          size="xs"
                          onClick={() => setShareItem(sf as Folder)}
                        >
                          Share
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => setPendingDeleteId(sf.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </SortableSubfolderRow>
              ))}
            </SortableContext>

            {/* ARIA live region for reorder announcements */}
            <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
              {reorderAnnounce}
            </div>

            {/* Drag overlay — floating clone while dragging */}
            <DragOverlay dropAnimation={null}>
              {activeDragSubfolder ? <SubfolderDragOverlay subfolder={activeDragSubfolder} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <EmptyState
          icon="📂"
          title="Nest notes in subfolders"
          description="Subfolders let you add an extra level of organization inside your folders. Create one to group related notes together."
          action={
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                leftIcon={<Icon d={IC.plus} size={14} />}
              >
                New subfolder
              </Button>
              <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", maxWidth: 320, textAlign: "center" }}>
                Need a root folder first? Go to <a href="/dashboard/folders" style={{ color: "var(--color-accent)" }}>Folders</a> to create one.
              </p>
            </div>
          }
        />
      )}

      <PaginationBar
        currentPage={page}
        totalPages={Math.ceil(totalFiltered / PAGE_SIZE)}
        totalItems={totalFiltered}
        onPageChange={setPage}
        size="md"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Create modal                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Modal isOpen={isCreateOpen} onClose={resetAndClose} title="New Subfolder">
        <form
          onSubmit={handleCreateSubfolder}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
              <Input
                label="Subfolder Title *"
                placeholder="My new subfolder"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <label
                  htmlFor="parent-folder-select"
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                  }}
                >
                  Parent Folder *
                </label>
                <select
                  id="parent-folder-select"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-primary)",
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px var(--space-3)",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="" disabled>
                    Select a parent folder…
                  </option>
                  {flatFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {"\u00A0\u00A0\u00A0\u00A0".repeat(f.depth)}📁 {f.title}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Description"
                placeholder="A short description of this subfolder"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <label
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                  }}
                >
                  Visibility
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-3)",
                    background: "var(--color-bg-subtle)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "4px",
                    width: "fit-content",
                  }}
                >
                  {(["public", "private"] as Visibility[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setNewVisibility(v)}
                      style={{
                        padding: "6px 12px",
                        border: "none",
                        background:
                          newVisibility === v
                            ? "var(--color-accent-subtle)"
                            : "transparent",
                        color:
                          newVisibility === v
                            ? "var(--color-accent)"
                            : "var(--color-text-muted)",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-medium)",
                      }}
                    >
                      {v === "public" ? "🌎 Public" : "🔒 Private"}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "var(--space-3)",
                  justifyContent: "flex-end",
                  marginTop: "var(--space-4)",
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={resetAndClose}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Create Subfolder
                </Button>
              </div>
          </form>
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* Edit modal                                                           */}
      {/* ------------------------------------------------------------------ */}
      <Modal isOpen={!!editFolder} onClose={() => setEditFolder(null)} title="Edit Subfolder">
        <form onSubmit={handleUpdateSubfolder} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Input label="Subfolder Title *" placeholder="My subfolder" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <label htmlFor="edit-parent-folder-select" style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>
              Parent Folder
            </label>
            <select
              id="edit-parent-folder-select"
              value={editParentId}
              onChange={(e) => setEditParentId(e.target.value)}
              style={{
                width: "100%",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-primary)",
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "10px var(--space-3)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">None (root folder)</option>
              {flatFolders.filter((f) => !editExcludeIds.has(f.id)).map((f) => (
                <option key={f.id} value={f.id}>{"\u00A0\u00A0\u00A0\u00A0".repeat(f.depth)}📁 {f.title}</option>
              ))}
            </select>
          </div>

          <Input label="Description" placeholder="A short description of this subfolder" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <label style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>Visibility</label>
            <div style={{ display: "flex", gap: "var(--space-3)", background: "var(--color-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "4px", width: "fit-content" }}>
              {(["public", "private"] as Visibility[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setEditVisibility(v)}
                  style={{
                    padding: "6px 12px",
                    border: "none",
                    background: editVisibility === v ? "var(--color-accent-subtle)" : "transparent",
                    color: editVisibility === v ? "var(--color-accent)" : "var(--color-text-muted)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                  }}
                >
                  {v === "public" ? "🌎 Public" : "🔒 Private"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", marginTop: "var(--space-4)" }}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditFolder(null)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={editing}>{editing ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* Delete confirmation modal                                           */}
      {/* ------------------------------------------------------------------ */}
      <Modal isOpen={!!pendingDeleteId} onClose={() => setPendingDeleteId(null)} width={360}>
        <h3 style={{ marginBottom: "var(--space-2)", fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)" }}>
          Delete subfolder?
        </h3>
        <p style={{ marginBottom: "var(--space-6)", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          This will permanently delete the subfolder and all its notes. This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <Button type="button" variant="secondary" size="sm" onClick={() => setPendingDeleteId(null)}>
            Cancel
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={() => pendingDeleteId && handleDeleteSubfolder(pendingDeleteId)}>
            Delete
          </Button>
        </div>
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* Share modal                                                         */}
      {/* ------------------------------------------------------------------ */}
      {shareItem && (
        <ShareModal
          isOpen={!!shareItem}
          onClose={() => setShareItem(null)}
          itemId={shareItem.id}
          itemTitle={shareItem.title}
          itemType="folder"
          itemSlug={shareItem.slug}
          ownerUsername={user?.username || "u"}
          ownerId={user?.id}
        />
      )}
    </DashboardLayout>
  );
}
