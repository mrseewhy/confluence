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
import type { Note } from "@/types";

// (formatDate imported from @/lib/helpers)

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

  const loadData = useCallback(async () => {
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
      for (const f of allFolders || []) {
        folderMap.set(f.id, f as { id: string; title: string; slug: string; parent_id: string | null });
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
      for (const f of (allFolders || []) as Array<{ id: string; title: string; slug: string; parent_id: string | null }>) {
        if (f.parent_id) {
          const parent = folderMap.get(f.parent_id);
          if (parent) {
            pfMap.set(f.id, { title: parent.title, slug: parent.slug });
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

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Reset page when search/vis changes
  useEffect(() => {
    setPage(1);
  }, [search, vis]);

  const filtered = notesList.filter((n) => {
    const q = search.toLowerCase();
    return (
      (n.title.toLowerCase().includes(q) ||
        (n.description ?? "").toLowerCase().includes(q) ||
        (n.folder?.title ?? "").toLowerCase().includes(q)) &&
      (vis === "all" || n.visibility === vis)
    );
  });

  const handleCopyLink = (note: Note, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = `${window.location.origin}/${user?.username || "u"}/n/${note.slug}`;
    navigator.clipboard.writeText(link);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("notes").delete().eq("id", id);

      if (error) throw error;
      await loadData();
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
        <div
          style={{
            padding: "var(--space-20)",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          Loading notes…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} variant="user">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "var(--space-6)",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: "var(--font-weight-bold)",
              letterSpacing: "var(--letter-spacing-tight)",
              marginBottom: "var(--space-1)",
            }}
          >
            Notes
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
            }}
          >
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

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
          flexWrap: "wrap",
        }}
      >
        <input
          type="search"
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 220px",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-primary)",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-2) var(--space-3)",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.boxShadow =
              "0 0 0 3px var(--color-accent-subtle)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {(["all", "public", "private"] as const).map((v) => (
            <Button
              key={v}
              variant={vis === v ? "accent-ghost" : "secondary"}
              size="sm"
              onClick={() => setVis(v)}
              style={{ textTransform: "capitalize" }}
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 160px 90px 120px 140px",
              gap: "var(--space-4)",
              padding: "var(--space-3) var(--space-5)",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-bg-subtle)",
            }}
          >
            {["Note", "Folder", "Visibility", "Updated", "Actions"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: "11px",
                  fontWeight: "var(--font-weight-semibold)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {filtered.map((note, i) => (
            <div
              key={note.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px 90px 120px 140px",
                gap: "var(--space-4)",
                alignItems: "center",
                padding: "var(--space-4) var(--space-5)",
                borderBottom:
                  i < filtered.length - 1
                    ? "1px solid var(--color-border-subtle)"
                    : "none",
                transition: "background var(--duration-fast)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-bg-subtle)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--color-accent-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-accent)",
                    flexShrink: 0,
                  }}
                >
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
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
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
          title="No notes found"
          description="Create your first note to get started."
          action={
            <Link to="/dashboard/notes/new">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Icon d={IC.plus} size={14} />}
              >
                New note
              </Button>
            </Link>
          }
        />
      )}

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-3)",
            marginTop: "var(--space-6)",
          }}
        >
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-elevated)",
              color: page <= 1 ? "var(--color-text-muted)" : "var(--color-text-primary)",
              cursor: page <= 1 ? "not-allowed" : "pointer",
              opacity: page <= 1 ? 0.5 : 1,
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
            Page {page} of {Math.ceil(totalCount / PAGE_SIZE)}
          </span>
          <button
            disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
            onClick={() => setPage((p) => p + 1)}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-elevated)",
              color: page >= Math.ceil(totalCount / PAGE_SIZE) ? "var(--color-text-muted)" : "var(--color-text-primary)",
              cursor: page >= Math.ceil(totalCount / PAGE_SIZE) ? "not-allowed" : "pointer",
              opacity: page >= Math.ceil(totalCount / PAGE_SIZE) ? 0.5 : 1,
            }}
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
