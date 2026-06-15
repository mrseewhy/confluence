import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button, EmptyState } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { ShareModal } from "@/components/ShareModal";
import { Modal } from "@/components/Modal";
import { formatDate } from "@/lib/helpers";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PaginationBar } from "@/components/PaginationBar";
import styles from "@/styles/dashboard.module.css";
import { safeStr, safeArray } from "@/lib/safeParse";
import type { Note } from "@/types";
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

// ── Sortable note row ────────────────────────────────────────

function SortableNoteRow({
  note,
  isDragOverlay,
  onKeyMove,
  children,
}: {
  note: { id: string; sort_order?: number; title?: string };
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
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : isDragOverlay ? 1 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 100 : isDragOverlay ? 200 : 1,
    boxShadow: isDragOverlay
      ? "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)"
      : "none",
    transformOrigin: "center" as const,
    scale: isDragOverlay ? 1.03 : 1,
    borderRadius: "var(--radius-lg)",
    overflow: "hidden" as const,
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onKeyMove?.(note.id, 'up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onKeyMove?.(note.id, 'down');
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.tableRow} ${styles.cols5_Notes}`}
      onKeyDown={isDragOverlay ? undefined : handleKeyDown}
      aria-label={`${isDragOverlay ? '' : 'Drag to reorder. Press Alt+ArrowUp or Alt+ArrowDown to move. '}${note.title || ''}`}
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
          }}
          title="Drag to reorder · Alt+↑↓ to move"
        >
          ⠿
        </div>
      )}
    </div>
  );
}

// ── Drag overlay clone ───────────────────────────────────────

function NoteDragOverlay({ note }: { note: Note }) {
  return (
    <SortableNoteRow note={note} isDragOverlay>
      <div style={{ gridColumn: "2 / -1", display: "contents" }}>
        <div className={styles.cellFlex}>
          <div className={styles.iconBadge} style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}>
            <Icon d={IC.notes} size={15} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)" }}>
              {note.title}
            </span>
          </div>
        </div>
      </div>
    </SortableNoteRow>
  );
}

export function DashboardNotes() {
  const { profile } = useAuth();
  const user = profile;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [notesList, setNotesList] = useState<Note[]>([]);
  const [parentFolders, setParentFolders] = useState<Map<string, { title: string; slug: string }>>(new Map());
  const [totalCount, setTotalCount] = useState(0);
  const [vis, setVis] = useState<"all" | "public" | "private">("all");
  const [shareItem, setShareItem] = useState<Note | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeDragNote, setActiveDragNote] = useState<Note | null>(null);
  const [reorderAnnounce, setReorderAnnounce] = useState("");

  // Clear ARIA announcement after 3 seconds
  useEffect(() => {
    if (!reorderAnnounce) return
    const t = setTimeout(() => setReorderAnnounce(""), 3000)
    return () => clearTimeout(t)
  }, [reorderAnnounce])

  // Pagination
  const [search, setSearch] = useState("");
  const { page, setPage, pageSize: PAGE_SIZE, resetPage } = usePaginatedFetch({ totalCount });

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  // ── Data fetching ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const supabase = requireSupabase();

      // Get total count (non-deleted only)
      const { count } = await supabase
        .from("notes")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .is("deleted_at", null);
      setTotalCount(count ?? 0);

      // Fetch all folders for this user (to build parent hierarchy)
      const { data: allFolders } = await supabase
        .from("folders")
        .select("id, title, slug, parent_id")
        .eq("owner_id", user.id);

      const folderMap = new Map<string, { id: string; title: string; slug: string; parent_id: string | null }>();
      const safeFolders = safeArray<Record<string, unknown>>(allFolders);
      for (const f of safeFolders) {
        folderMap.set(safeStr(f.id), { id: safeStr(f.id), title: safeStr(f.title), slug: safeStr(f.slug), parent_id: safeStr(f.parent_id) || null });
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("notes")
        .select("*, folder:folders!folder_id(id, title, slug, parent_id)")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Build parent folder lookup by checking which folders have parents
      const pfMap = new Map<string, { title: string; slug: string }>();
      for (const f of safeFolders) {
        const fParentId = safeStr(f.parent_id) || null;
        if (fParentId) {
          const parent = folderMap.get(fParentId);
          if (parent) {
            pfMap.set(safeStr(f.id), { title: parent.title, slug: parent.slug });
          }
        }
      }

      setNotesList(data || []);
      setParentFolders(pfMap);
    } catch {
      addToast("Failed to load notes", "error");
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  // Initial data load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  const filtered = notesList.filter((n) => {
    const q = search.toLowerCase();
    return (
      (n.title.toLowerCase().includes(q) ||
        (n.description ?? "").toLowerCase().includes(q) ||
        (n.folder?.title ?? "").toLowerCase().includes(q)) &&
      (vis === "all" || n.visibility === vis)
    );
  });

  const handleCopyLink = async (note: Note, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = `${window.location.origin}/${user?.username || "u"}/n/${note.slug}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      }
    } catch {
      // Clipboard write failed — silently ignore
    }
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const supabase = requireSupabase();
      // Confirm it was not previously trashed before we soft-delete
      const deletedAt = new Date().toISOString();

      // Soft-delete: set deleted_at instead of hard delete
      const { error } = await supabase
        .from("notes")
        .update({ deleted_at: deletedAt })
        .eq("id", id);

      if (error) throw error;
      await fetchData();
      addToast("Note moved to trash", "success", {
        label: "Undo",
        onClick: async () => {
          // Restore by clearing deleted_at
          const { error: undoErr } = await supabase
            .from("notes")
            .update({ deleted_at: null })
            .eq("id", id);
          if (undoErr) {
            addToast("Failed to undo. Try again.", "error");
            return;
          }
          await fetchData();
        },
      });
    } catch {
      addToast("Failed to delete note", "error");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // ── Keyboard reorder handler ─────────────────────────────

  const handleKeyboardMove = async (id: string, direction: 'up' | 'down') => {
    try {
      const supabase = requireSupabase();
      const sorted = [...filtered];
      const idx = sorted.findIndex((n) => n.id === id);
      if (idx === -1) return;

      if (direction === 'up' && idx > 0) {
        const current = sorted[idx];
        const above = sorted[idx - 1];
        const origCurrent = { id: current.id, sort_order: current.sort_order };
        const origAbove = { id: above.id, sort_order: above.sort_order };
        await supabase.from("notes").update({ sort_order: above.sort_order }).eq("id", current.id);
        await supabase.from("notes").update({ sort_order: current.sort_order }).eq("id", above.id);
        await fetchData();
        setReorderAnnounce("Note moved up")
        addToast("Note moved", "success", {
          label: "Undo",
          onClick: async () => {
            await supabase.from("notes").update({ sort_order: origCurrent.sort_order }).eq("id", origCurrent.id);
            await supabase.from("notes").update({ sort_order: origAbove.sort_order }).eq("id", origAbove.id);
            await fetchData();
          },
        });
      } else if (direction === 'down' && idx < sorted.length - 1) {
        const current = sorted[idx];
        const below = sorted[idx + 1];
        const origCurrent = { id: current.id, sort_order: current.sort_order };
        const origBelow = { id: below.id, sort_order: below.sort_order };
        await supabase.from("notes").update({ sort_order: below.sort_order }).eq("id", current.id);
        await supabase.from("notes").update({ sort_order: current.sort_order }).eq("id", below.id);
        await fetchData();
        setReorderAnnounce("Note moved down")
        addToast("Note moved", "success", {
          label: "Undo",
          onClick: async () => {
            await supabase.from("notes").update({ sort_order: origCurrent.sort_order }).eq("id", origCurrent.id);
            await supabase.from("notes").update({ sort_order: origBelow.sort_order }).eq("id", origBelow.id);
            await fetchData();
          },
        });
      }
    } catch {
      addToast("Failed to reorder. Try again.", "error");
    }
  };

  // ── Drag-to-reorder handler ────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const dragged = notesList.find((n) => n.id === event.active.id);
    if (dragged) setActiveDragNote(dragged);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragNote(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    try {
      const supabase = requireSupabase();

      const sorted = [...filtered].map((f, i) => ({ ...f, _idx: i }));

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
            .from("notes")
            .update({ sort_order: update.sort_order })
            .eq("id", update.id),
        ),
      );

      await fetchData();
      setReorderAnnounce("Notes reordered")
      addToast("Notes reordered", "success", {
        label: "Undo",
        onClick: async () => {
          await Promise.all(
            originalOrders.map((orig) =>
              supabase.from("notes").update({ sort_order: orig.sort_order }).eq("id", orig.id),
            ),
          );
          await fetchData();
        },
      });
    } catch {
      addToast("Failed to reorder. Try again.", "error");
    }
  };

  if (!user || loading) {
    return (
      <DashboardLayout
        user={
          user || fallbackProfile()
        }
        variant="user"
      >
        <div className={styles.loadingState}>
          Loading notes…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} variant="user">
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.headerTitle}>
            Notes
          </h1>
          <p className={styles.headerSubtitle}>
            {notesList.length} note{notesList.length !== 1 ? "s" : ""} in your
            workspace
          </p>
        </div>
        <Link to="/dashboard/notes/new">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Icon d={IC.plus} size={14} />}
          >
            New note
          </Button>
        </Link>
      </div>

      <div className={styles.filterRow}>
        <input
          type="search"
          placeholder="Search notes…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          className={styles.searchInput}
          aria-label="Search notes"
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

      {filtered.length > 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.tableHeader} style={{ gridTemplateColumns: "24px 1fr 160px 90px 120px 140px" }}>
            {["", "Note", "Folder", "Visibility", "Updated", "Actions"].map((h) => (
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
              items={filtered.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              {filtered.map((note) => (
                <SortableNoteRow key={note.id} note={note} onKeyMove={handleKeyboardMove}>
                  <div style={{ gridColumn: "2 / -1", display: "contents" }}>
                    <div className={styles.cellFlex}>
                      <div className={styles.iconBadge} style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}>
                        <Icon d={IC.notes} size={15} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <a
                          href={`/${user?.username || "u"}/n/${note.slug}`}
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
                          {note.title}
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

                        {/* Public URL Display in note row */}
                        {note.visibility === "public" ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "var(--space-2)",
                              marginTop: "2px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--color-accent)",
                                fontFamily: "var(--font-mono)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {`/${user?.username || "u"}/n/${note.slug}`}
                            </span>
                            <button
                              onClick={(e) => handleCopyLink(note, e)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--color-text-muted)",
                                fontSize: "10px",
                                cursor: "pointer",
                                padding: "0 4px",
                                textDecoration: "underline",
                              }}
                            >
                              {copiedId === note.id ? "Copied!" : "Copy link"}
                            </button>
                          </div>
                        ) : note.description ? (
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
                            {note.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-secondary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-1)",
                      }}
                    >
                      {(() => {
                        if (!note.folder) return "—";
                        const username = user?.username || "u";
                        const pf = parentFolders.get(note.folder_id);
                        return (
                          <>
                            {pf && (
                              <>
                                <a
                                  href={`/${username}/folder/${pf.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    color: "var(--color-text-secondary)",
                                    textDecoration: "none",
                                    fontSize: "inherit",
                                    fontFamily: "inherit",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                                >
                                  {pf.title}
                                </a>
                                <span style={{ opacity: 0.4 }}>›</span>
                              </>
                            )}
                            <a
                              href={`/${username}/folder/${note.folder.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: "var(--color-accent)",
                                textDecoration: "none",
                                fontSize: "inherit",
                                fontFamily: "inherit",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                            >
                              {note.folder.title}
                            </a>
                          </>
                        );
                      })()}
                    </span>
                    <Badge
                      variant={note.visibility === "public" ? "accent" : "muted"}
                    >
                      {note.visibility}
                    </Badge>
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {formatDate(note.updated_at)}
                    </span>
                    <div className={styles.cellActions}>
                      <Link to={`/dashboard/notes/${note.slug}/edit`}>
                        <Button variant="accent-ghost" size="xs">
                          Edit
                        </Button>
                      </Link>
                      {note.visibility === "private" && (
                        <Button
                          variant="accent-ghost"
                          size="xs"
                          onClick={() => setShareItem(note)}
                        >
                          Share
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => setDeleteConfirmId(note.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </SortableNoteRow>
              ))}
            </SortableContext>

            {/* ARIA live region for reorder announcements */}
            <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
              {reorderAnnounce}
            </div>

            {/* Drag overlay — renders a floating clone while dragging */}
            <DragOverlay dropAnimation={null}>
              {activeDragNote ? <NoteDragOverlay note={activeDragNote} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <EmptyState
          icon="📝"
          title="Create your first note"
          description="Notes are the building blocks of Confluence. Start writing — you can add headings, code snippets, images, and video embeds."
          action={
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }}>
              <Link to="/dashboard/notes/new">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Icon d={IC.plus} size={14} />}
                >
                  New note
                </Button>
              </Link>
              <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", maxWidth: 320, textAlign: "center" }}>
                Tip: Create a folder first to organize your notes. Head to <a href="/dashboard/folders" style={{ color: "var(--color-accent)" }}>Folders</a> to get started.
              </p>
            </div>
          }
        />
      )}

      <PaginationBar
        currentPage={page}
        totalPages={Math.ceil(totalCount / PAGE_SIZE)}
        totalItems={totalCount}
        onPageChange={setPage}
        size="md"
      />

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        width={400}
      >
        <h3
          style={{
            fontSize: "var(--font-size-lg)",
            fontWeight: "var(--font-weight-bold)",
            marginBottom: "var(--space-3)",
            color: "var(--color-danger)",
          }}
        >
          Delete this note?
        </h3>
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
            marginBottom: "var(--space-2)",
            lineHeight: "var(--line-height-normal)",
          }}
        >
          This will move the note to trash. You can restore it from the trash page within 30 days.
        </p>
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "flex-end",
            marginTop: "var(--space-4)",
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDeleteConfirmId(null)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => deleteConfirmId ? handleDeleteNote(deleteConfirmId) : null}
          >
            Yes, delete
          </Button>
        </div>
      </Modal>

      {/* Share Modal */}
      {shareItem && (
        <ShareModal
          isOpen={!!shareItem}
          onClose={() => setShareItem(null)}
          itemId={shareItem.id}
          itemTitle={shareItem.title}
          itemType="note"
          itemSlug={shareItem.slug}
          ownerUsername={user?.username || "u"}
          ownerId={user?.id}
        />
      )}
    </DashboardLayout>
  );
}
