import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button, EmptyState, Input } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { ShareModal } from "@/components/ShareModal";
import { formatDate, buildSlug } from "@/lib/helpers";
import { Modal } from "@/components/Modal";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { PaginationBar } from "@/components/PaginationBar";
import styles from "@/styles/dashboard.module.css";
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

// ── Sortable row wrapper ─────────────────────────────────────

function SortableFolderRow({
  folder,
  isDragOverlay,
  onKeyMove,
  children,
}: {
  folder: { id: string; sort_order?: number; title?: string };
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
  } = useSortable({ id: folder.id });

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
        onKeyMove?.(folder.id, 'up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onKeyMove?.(folder.id, 'down');
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.tableRow}
      onKeyDown={isDragOverlay ? undefined : handleKeyDown}
      aria-label={`${isDragOverlay ? '' : 'Drag to reorder. Press Alt+ArrowUp or Alt+ArrowDown to move. '}${folder.title || ''}`}
      {...attributes}
      {...(isDragOverlay ? {} : listeners)}
    >
      {children}
      {/* Drag handle — positioned absolutely on the left edge */}
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

function FolderDragOverlay({ folder }: { folder: Folder }) {
  return (
    <SortableFolderRow folder={folder} isDragOverlay>
      <div style={{ gridColumn: "2 / -1", display: "contents" }}>
        <div className={styles.cellFlex}>
          <div className={styles.iconBadge} style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}>
            <Icon d={IC.folder} size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)" }}>
              {folder.title}
            </span>
            {folder.description && (
              <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                {folder.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </SortableFolderRow>
  );
}

export function DashboardFolders() {
  const { profile } = useAuth();
  const user = profile;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [foldersList, setFoldersList] = useState<Folder[]>([]);
  const [notesList, setNotesList] = useState<{ id: string; folder_id: string }[]>([]);
  const [totalRootCount, setTotalRootCount] = useState(0);
  const [vis, setVis] = useState<"all" | "public" | "private">("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Share Modal State
  const [shareItem, setShareItem] = useState<Folder | null>(null);

  // Create Folder State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newVisibility, setNewVisibility] = useState<Visibility>("public");
  const [newParentId, setNewParentId] = useState("");
  const resetCreateFields = useCallback(() => {
    setNewTitle("");
    setNewDesc("");
    setNewVisibility("public");
    setNewParentId("");
    setIsCreateOpen(false);
  }, []);
  const [allFoldersForSelect, setAllFoldersForSelect] = useState<{ id: string; title: string; parent_id: string | null }[]>([]);

  const flatFolderOptions = useMemo(() => {
    const roots = allFoldersForSelect.filter((f) => !f.parent_id);
    const result: { id: string; title: string; depth: number }[] = [];
    const addChildren = (parentId: string, depth: number) => {
      const children = allFoldersForSelect.filter((f) => f.parent_id === parentId);
      for (const child of children) {
        result.push({ id: child.id, title: child.title, depth });
        addChildren(child.id, depth + 1);
      }
    };
    for (const root of roots) {
      result.push({ id: root.id, title: root.title, depth: 0 });
      addChildren(root.id, 1);
    }
    return result;
  }, [allFoldersForSelect]);

  // Edit Folder State
  const [editFolder, setEditFolder] = useState<Folder | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVisibility, setEditVisibility] = useState<Visibility>("public");
  const [editing, setEditing] = useState(false);

  // Pagination + search
  const { page, setPage, pageSize: PAGE_SIZE, resetPage } = usePaginatedFetch({ totalCount: totalRootCount });
  const { search, setSearch, debouncedSearch } = useDebouncedSearch({ onSearchChange: resetPage });

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms touch hold before drag starts
        tolerance: 5, // Allow 5px movement tolerance
      },
    }),
  );

  // Drag overlay state
  const [activeDragFolder, setActiveDragFolder] = useState<Folder | null>(null);
  const [reorderAnnounce, setReorderAnnounce] = useState("");

  // Clear ARIA announcement after 3 seconds
  useEffect(() => {
    if (!reorderAnnounce) return
    const t = setTimeout(() => setReorderAnnounce(""), 3000)
    return () => clearTimeout(t)
  }, [reorderAnnounce])

  // ── Data fetching ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const supabase = requireSupabase();

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let foldersQuery = supabase
        .from("folders")
        .select("*")
        .eq("owner_id", user.id)
        .is("parent_id", null);

      if (debouncedSearch) {
        foldersQuery = foldersQuery.or(
          `title.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`
        );
      }

      const { data: folders, error: foldersErr } = await foldersQuery
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .range(from, to);

      const [
        { data: subfolders, error: subErr },
        { data: notes, error: notesErr },
      ] = await Promise.all([
        supabase.from("folders").select("id, parent_id").eq("owner_id", user.id).not("parent_id", "is", null),
        supabase.from("notes").select("id, folder_id").eq("owner_id", user.id),
      ]);

      if (foldersErr) throw foldersErr;
      if (subErr) throw subErr;
      if (notesErr) throw notesErr;

      const allSubs = subfolders || [];
      setFoldersList([...(folders || []), ...allSubs]);
      setNotesList(notes || []);
    } catch {
      addToast("Failed to load folders", "error");
    } finally {
      setLoading(false);
    }
  }, [user, page, debouncedSearch]);

  // Initial data load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  // Build the enriched list from the root folders (those with parent_id === null in the fetched batch)
const rootFolders = foldersList.filter((f) => f.parent_id === null);

// Fetch total root folder count once on mount (and when search changes)
useEffect(() => {
  if (!user) return;
  const fetchCount = async () => {
    const supabase = requireSupabase();
    let countQuery = supabase
      .from("folders")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .is("parent_id", null);
    if (debouncedSearch) {
      countQuery = countQuery.or(
        `title.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`
      );
    }
    const { count } = await countQuery;
    if (count !== null) setTotalRootCount(count);
  };
  void fetchCount();
}, [user, debouncedSearch]);

// Fetch all folders for parent dropdown
useEffect(() => {
  if (!user) return;
  const load = async () => {
    const supabase = requireSupabase();
    const { data } = await supabase
      .from("folders")
      .select("id, title, parent_id")
      .eq("owner_id", user.id)
      .order("title");
    setAllFoldersForSelect(data || []);
  };
  void load();
}, [user]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !user) return;

    if (user.is_banned) {
      addToast("Account is banned — cannot create folders.", "error");
      return;
    }

    const slug = buildSlug(newTitle);

    try {
      const supabase = requireSupabase();
      // Get the current max sort_order for the selected parent scope
      const parentCondition = newParentId
        ? supabase.from("folders").select("sort_order").eq("owner_id", user.id).eq("parent_id", newParentId)
        : supabase.from("folders").select("sort_order").eq("owner_id", user.id).is("parent_id", null);
      const { data: maxOrder } = await parentCondition
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = (maxOrder?.[0]?.sort_order ?? -1) + 1;

      const { error } = await supabase.from("folders").insert({
        owner_id: user.id,
        parent_id: newParentId || null,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        slug,
        visibility: newVisibility,
        sort_order: nextOrder,
      });

      if (error) throw error;

      await fetchData();
      setIsCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewVisibility("public");
      setNewParentId("");
      addToast("Folder created successfully", "success");
    } catch {
      addToast("Failed to create folder", "error");
    }
  };

  const handleEditFolder = (folder: Folder) => {
    setEditFolder(folder);
    setEditTitle(folder.title);
    setEditDesc(folder.description || "");
    setEditVisibility(folder.visibility);
  };

  const handleUpdateFolder = async (e: React.FormEvent) => {
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
          visibility: editVisibility,
        })
        .eq("id", editFolder.id);

      if (error) throw error;

      await fetchData();
      setEditFolder(null);
      addToast("Folder updated successfully", "success");
    } catch {
      addToast("Failed to update folder", "error");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      const supabase = requireSupabase();

      // Save folder data before deleting for undo
      const { data: folderToDelete, error: fetchErr } = await supabase
        .from("folders")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchErr) throw fetchErr;

      const { error } = await supabase.from("folders").delete().eq("id", id);

      if (error) throw error;

      await fetchData();
      setConfirmDelete(null);
      addToast("Folder deleted", "success", {
        label: "Undo",
        onClick: async () => {
          if (!folderToDelete) return;
          const undoData = { ...folderToDelete };
          // If slug is taken, append a timestamp to avoid conflicts
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
          await fetchData();
        },
      });
    } catch {
      addToast("Failed to delete folder", "error");
    }
  };

  // ── Drag-to-reorder handler ────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const dragged = enrichedFolders.find((f) => f.id === event.active.id);
    if (dragged) setActiveDragFolder(dragged as unknown as Folder);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragFolder(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    try {
      const supabase = requireSupabase();

      // Save original order for undo
      const sorted = [...rootFolders].map((f, i) => ({ ...f, _idx: i }));

      const oldIndex = sorted.findIndex((f) => f.id === active.id);
      const newIndex = sorted.findIndex((f) => f.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      // Reorder the array
      const reordered = [...sorted];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      // Save original sort_order for undo
      const originalOrders = sorted.map((item) => ({
        id: item.id,
        sort_order: item.sort_order,
      }));

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

      await fetchData();
      setReorderAnnounce("Folders reordered")
      addToast("Folders reordered", "success", {
        label: "Undo",
        onClick: async () => {
          await Promise.all(
            originalOrders.map((orig) =>
              supabase.from("folders").update({ sort_order: orig.sort_order }).eq("id", orig.id),
            ),
          );
          await fetchData();
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
      const sorted = [...enrichedFolders];
      const idx = sorted.findIndex((f) => f.id === id);
      if (idx === -1) return;

      if (direction === 'up' && idx > 0) {
        const current = sorted[idx];
        const above = sorted[idx - 1];
        // Save original values for undo
        const origCurrent = { id: current.id, sort_order: current.sort_order };
        const origAbove = { id: above.id, sort_order: above.sort_order };
        await supabase.from("folders").update({ sort_order: above.sort_order }).eq("id", current.id);
        await supabase.from("folders").update({ sort_order: current.sort_order }).eq("id", above.id);
        await fetchData();
        setReorderAnnounce("Folder moved up")
        addToast("Folder moved", "success", {
          label: "Undo",
          onClick: async () => {
            await supabase.from("folders").update({ sort_order: origCurrent.sort_order }).eq("id", origCurrent.id);
            await supabase.from("folders").update({ sort_order: origAbove.sort_order }).eq("id", origAbove.id);
            await fetchData();
          },
        });
      } else if (direction === 'down' && idx < sorted.length - 1) {
        const current = sorted[idx];
        const below = sorted[idx + 1];
        const origCurrent = { id: current.id, sort_order: current.sort_order };
        const origBelow = { id: below.id, sort_order: below.sort_order };
        await supabase.from("folders").update({ sort_order: below.sort_order }).eq("id", current.id);
        await supabase.from("folders").update({ sort_order: current.sort_order }).eq("id", below.id);
        await fetchData();
        setReorderAnnounce("Folder moved down")
        addToast("Folder moved", "success", {
          label: "Undo",
          onClick: async () => {
            await supabase.from("folders").update({ sort_order: origCurrent.sort_order }).eq("id", origCurrent.id);
            await supabase.from("folders").update({ sort_order: origBelow.sort_order }).eq("id", origBelow.id);
            await fetchData();
          },
        });
      }
    } catch {
      addToast("Failed to reorder. Try again.", "error");
    }
  };

  // Pre-calculate subfolders and notes count for rendering
  const enrichedFolders = rootFolders.map((folder) => {
    const subCount = foldersList.filter(
      (f) => f.parent_id === folder.id,
    ).length;
    const noteCount = notesList.filter((n) => n.folder_id === folder.id).length;
    return {
      ...folder,
      note_count: noteCount,
      subCount,
    };
  });

  if (!user || loading) {
    return (
      <DashboardLayout
        user={
          user || fallbackProfile()
        }
        variant="user"
      >
        <div className={styles.loadingState}>
          Loading folders…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} variant="user">
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.headerTitle}>
            Folders
          </h1>
          <p className={styles.headerSubtitle}>
            {rootFolders.length} folder{rootFolders.length !== 1 ? "s" : ""} in
            your workspace
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Icon d={IC.plus} size={14} />}
        >
          New folder
        </Button>
      </div>

      {/* Controls */}
      <div className={styles.filterRow}>
        <input
          type="search"
          placeholder="Search folders…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          className={styles.searchInput}
          aria-label="Search folders"
        />
        <div className={styles.filterBtnGroup}>
          {(["all", "public", "private"] as const).map((v) => (              <Button
                key={v}
                variant={vis === v ? "accent-ghost" : "secondary"}
                size="sm"
                onClick={() => { setVis(v); resetPage(); }}
                style={{ textTransform: "capitalize" }}
                aria-pressed={vis === v}
              >
              {v}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {enrichedFolders.length > 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader} style={{ gridTemplateColumns: "24px 1fr 80px 100px 120px 140px" }}>
            {["", "Folder", "Notes", "Visibility", "Updated", "Actions"].map((h) => (
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
              items={enrichedFolders.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              {enrichedFolders.map((folder) => (
                <SortableFolderRow key={folder.id} folder={folder} onKeyMove={handleKeyboardMove}>
                  <div style={{ gridColumn: "2 / -1", display: "contents" }}>
                    {/* Title + sub */}
                    <div className={styles.cellFlex}>
                      <div className={styles.iconBadge} style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}>
                        <Icon d={IC.folder} size={16} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <a
                          href={`/${user?.username || "u"}/folder/${folder.slug}`}
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
                          {folder.title}
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
                        {folder.description && (
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
                            {folder.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {folder.note_count ?? 0}
                    </span>
                    <Badge
                      variant={folder.visibility === "public" ? "accent" : "muted"}
                    >
                      {folder.visibility}
                    </Badge>
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {formatDate(folder.updated_at)}
                    </span>
                    <div className={styles.cellActions}>
                      <Button
                        variant="accent-ghost"
                        size="xs"
                        onClick={() => handleEditFolder(folder)}
                      >
                        Edit
                      </Button>
                      {folder.visibility === "private" && (
                        <Button
                          variant="accent-ghost"
                          size="xs"
                          onClick={() => setShareItem(folder)}
                        >
                          Share
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => setConfirmDelete(folder.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </SortableFolderRow>
              ))}
            </SortableContext>

            {/* ARIA live region for reorder announcements */}
            <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
              {reorderAnnounce}
            </div>

            {/* Drag overlay — floating clone while dragging */}
            <DragOverlay dropAnimation={null}>
              {activeDragFolder ? <FolderDragOverlay folder={activeDragFolder} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <EmptyState
          icon="📁"
          title="Organize your workspace"
          description="Folders help you group related notes together. Create a folder, then add notes or subfolders inside it."
          action={
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                leftIcon={<Icon d={IC.plus} size={14} />}
              >
                New folder
              </Button>
              <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", maxWidth: 320, textAlign: "center" }}>
                Folders can be public (shareable link) or private (only visible to you and invited collaborators).
              </p>
            </div>
          }
        />
      )}

      <PaginationBar
        currentPage={page}
        totalPages={Math.ceil(totalRootCount / PAGE_SIZE)}
        totalItems={totalRootCount}
        onPageChange={setPage}
        size="md"
      />

      {/* Delete confirm modal */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} width={360}>
        <h4 style={{ marginBottom: "var(--space-3)" }}>Delete folder?</h4>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>
          This will permanently delete the folder, all its subfolders, and all its notes. This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => confirmDelete && handleDeleteFolder(confirmDelete)}>Delete</Button>
        </div>
      </Modal>

      {/* Create Folder Modal */}
      <Modal isOpen={isCreateOpen} onClose={resetCreateFields} title="New Folder">
        <form onSubmit={handleCreateFolder} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <Input
                label="Folder Title *"
                placeholder="My new folder"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
              <Input
                label="Description"
                placeholder="A short description of this folder"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />

              <div>
                <label style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", display: "block", marginBottom: "var(--space-2)" }}>
                  Parent Folder <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(leave empty for root)</span>
                </label>
                <select
                  value={newParentId}
                  onChange={(e) => setNewParentId(e.target.value)}
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
                  {flatFolderOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {"\u00A0\u00A0\u00A0\u00A0".repeat(f.depth)}📁 {f.title}
                    </option>
                  ))}
                </select>
              </div>

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
                  <button
                    type="button"
                    onClick={() => setNewVisibility("public")}
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      background:
                        newVisibility === "public"
                          ? "var(--color-accent-subtle)"
                          : "transparent",
                      color:
                        newVisibility === "public"
                          ? "var(--color-accent)"
                          : "var(--color-text-muted)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      fontSize: "var(--font-size-sm)",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    🌎 Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVisibility("private")}
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      background:
                        newVisibility === "private"
                          ? "var(--color-accent-subtle)"
                          : "transparent",
                      color:
                        newVisibility === "private"
                          ? "var(--color-accent)"
                          : "var(--color-text-muted)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      fontSize: "var(--font-size-sm)",
                      fontWeight: "var(--font-weight-medium)",
                    }}
                  >
                    🔒 Private
                  </button>
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
                  onClick={resetCreateFields}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Create Folder
                </Button>
              </div>
        </form>
      </Modal>

      {/* Edit Folder Modal */}
      <Modal isOpen={!!editFolder} onClose={() => setEditFolder(null)} title="Edit Folder">
        <form onSubmit={handleUpdateFolder} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Input
            label="Folder Title *"
            placeholder="My folder"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />
          <Input
            label="Description"
            placeholder="A short description of this folder"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <label style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>
              Visibility
            </label>
            <div style={{ display: "flex", gap: "var(--space-3)", background: "var(--color-bg-subtle)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "4px", width: "fit-content" }}>
              <button
                type="button"
                onClick={() => setEditVisibility("public")}
                style={{ padding: "6px 12px", border: "none", background: editVisibility === "public" ? "var(--color-accent-subtle)" : "transparent", color: editVisibility === "public" ? "var(--color-accent)" : "var(--color-text-muted)", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}
              >
                🌎 Public
              </button>
              <button
                type="button"
                onClick={() => setEditVisibility("private")}
                style={{ padding: "6px 12px", border: "none", background: editVisibility === "private" ? "var(--color-accent-subtle)" : "transparent", color: editVisibility === "private" ? "var(--color-accent)" : "var(--color-text-muted)", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}
              >
                🔒 Private
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", marginTop: "var(--space-4)" }}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditFolder(null)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={editing}>{editing ? "Saving…" : "Save changes"}</Button>
          </div>
        </form>
      </Modal>

      {/* Share Modal */}
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
