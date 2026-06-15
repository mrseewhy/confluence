import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button, EmptyState } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { ShareModal } from "@/components/ShareModal";
import { Modal } from "@/components/Modal";
import { formatDate } from "@/lib/helpers";
import styles from "@/styles/dashboard.module.css";
import { safeStr, safeArray } from "@/lib/safeParse";
import type { Note } from "@/types";

export function DashboardNotes() {
  const { profile } = useAuth();
  const user = profile;

  const [loading, setLoading] = useState(true);
  const [notesList, setNotesList] = useState<Note[]>([]);
  const [parentFolders, setParentFolders] = useState<Map<string, { title: string; slug: string }>>(new Map());
  const [search, setSearch] = useState("");
  const [vis, setVis] = useState<"all" | "public" | "private">("all");
  const [shareItem, setShareItem] = useState<Note | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  // ── Data fetching ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const supabase = requireSupabase();

      // Get total count
      const { count } = await supabase
        .from("notes")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id);
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
    } catch (err) {
      console.error("Error loading notes:", err);
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
      const { error } = await supabase.from("notes").delete().eq("id", id);

      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error("Error deleting note:", err);
    } finally {
      setDeleteConfirmId(null);
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
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className={styles.searchInput}
          aria-label="Search notes"
        />
        <div className={styles.filterBtnGroup}>
          {(["all", "public", "private"] as const).map((v) => (              <Button
                key={v}
                variant={vis === v ? "accent-ghost" : "secondary"}
                size="sm"
                onClick={() => { setVis(v); setPage(1); }}
                style={{ textTransform: "capitalize" }}
                aria-pressed={vis === v}
              >
                {v}
              </Button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (        <div className={styles.tableCard}>
          <div className={`${styles.tableHeader} ${styles.cols5_Notes}`}>
            {["Note", "Folder", "Visibility", "Updated", "Actions"].map((h) => (
              <span className={styles.tableHeaderCell}>{h}</span>
            ))}
          </div>

          {filtered.map((note) => (
            <div
              key={note.id}
              className={`${styles.tableRow} ${styles.cols5_Notes}`}>
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
          ))}
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

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className={styles.paginationRow}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={styles.paginationBtn}
            aria-label="Previous page"
          >
            ← Prev
          </button>
          <span className={styles.paginationInfo}>
            Page {page} of {Math.ceil(totalCount / PAGE_SIZE)}
          </span>
          <button
            disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
            onClick={() => setPage((p) => p + 1)}
            className={styles.paginationBtn}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}

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
          This will permanently delete this note. This action cannot be undone.
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
