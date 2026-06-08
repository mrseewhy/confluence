import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button, EmptyState, Input } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { ShareModal } from "@/components/ShareModal";
import { formatDate, buildSlug } from "@/lib/helpers";
import { Modal } from "@/components/Modal";
import type { Folder, Visibility } from "@/types";

// (formatDate imported from @/lib/helpers)

export function DashboardFolders() {
  const { profile } = useAuth();
  const user = profile;

  const [loading, setLoading] = useState(true);
  const [foldersList, setFoldersList] = useState<Folder[]>([]);
  const [notesList, setNotesList] = useState<{ id: string; folder_id: string }[]>([]);
  const [search, setSearch] = useState("");
  const [vis, setVis] = useState<"all" | "public" | "private">("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Share Modal State
  const [shareItem, setShareItem] = useState<Folder | null>(null);

  // Create Folder State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newVisibility, setNewVisibility] = useState<Visibility>("public");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalRootCount, setTotalRootCount] = useState(0);
  const PAGE_SIZE = 20;

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const supabase = requireSupabase();

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: folders, error: foldersErr } = await supabase
        .from("folders")
        .select("*")
        .eq("owner_id", user.id)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      // Also fetch all subfolders + notes for the counts (lightweight query)
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

      // Combine root folders and all subfolders into foldersList (needed for enrichment)
      const allSubs = subfolders || [];
      setFoldersList([...(folders || []), ...allSubs]);
      setNotesList(notes || []);
    } catch (err) {
      console.error("Error fetching folders:", err);
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
  }, [search, vis]);// Build the enriched list from the root folders (those with parent_id === null in the fetched batch)
const rootFolders = foldersList.filter((f) => f.parent_id === null);

// Fetch total root folder count once on mount
useEffect(() => {
  if (!user) return;
  const fetchCount = async () => {
    const supabase = requireSupabase();
    const { count } = await supabase
      .from("folders")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .is("parent_id", null);
    if (count !== null) setTotalRootCount(count);
  };
  void fetchCount();
}, [user]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !user) return;

    if (user.is_banned) {
      console.error("Account is banned — cannot create folders.");
      return;
    }

    const slug = buildSlug(newTitle);

    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("folders").insert({
        owner_id: user.id,
        parent_id: null,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        slug,
        visibility: newVisibility,
      });

      if (error) throw error;

      await loadData();
      setIsCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewVisibility("public");
    } catch (err) {
      console.error("Error creating folder:", err);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("folders").delete().eq("id", id);

      if (error) throw error;

      await loadData();
      setConfirmDelete(null);
    } catch (err) {
      console.error("Error deleting folder:", err);
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
        <div
          style={{
            padding: "var(--space-20)",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          Loading folders…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} variant="user">
      {/* Header */}
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
            Folders
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
            }}
          >
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
          id="folder-search"
          name="folder-search"
          placeholder="Search folders…"
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

      {/* Table */}
      {enrichedFolders.length > 0 ? (
        <div
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          {/* Table head */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 100px 120px 140px",
              gap: "var(--space-4)",
              padding: "var(--space-3) var(--space-5)",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-bg-subtle)",
            }}
          >
            {["Folder", "Notes", "Visibility", "Updated", "Actions"].map(
              (h) => (
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
              ),
            )}
          </div>

          {enrichedFolders.map((folder, i) => (
            <div
              key={folder.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 100px 120px 140px",
                gap: "var(--space-4)",
                alignItems: "center",
                padding: "var(--space-4) var(--space-5)",
                borderBottom:
                  i < enrichedFolders.length - 1
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
              {/* Title + sub */}
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
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
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
          ))}
        </div>
      ) : (
        <EmptyState
          icon="📁"
          title="No folders found"
          description="Create your first folder to get started."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Icon d={IC.plus} size={14} />}
            >
              New folder
            </Button>
          }
        />
      )}

      {/* Pagination */}
      {totalRootCount > PAGE_SIZE && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-3)",
            marginTop: "var(--space-6)",
            marginBottom: "var(--space-6)",
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
            Page {page} of {Math.ceil(totalRootCount / PAGE_SIZE)}
          </span>
          <button
            disabled={page >= Math.ceil(totalRootCount / PAGE_SIZE)}
            onClick={() => setPage((p) => p + 1)}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-elevated)",
              color: page >= Math.ceil(totalRootCount / PAGE_SIZE) ? "var(--color-text-muted)" : "var(--color-text-primary)",
              cursor: page >= Math.ceil(totalRootCount / PAGE_SIZE) ? "not-allowed" : "pointer",
              opacity: page >= Math.ceil(totalRootCount / PAGE_SIZE) ? 0.5 : 1,
            }}
          >
            Next →
          </button>
        </div>
      )}

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
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Folder">
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
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Create Folder
                </Button>
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
