import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge, Button, EmptyState } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { formatDate } from "@/lib/helpers";
import { Modal } from "@/components/Modal";

// ─── Types ────────────────────────────────────────────────────

interface CollaboratorRow {
  id: string;
  inviter_id: string;
  invitee_email: string;
  folder_id: string | null;
  note_id: string | null;
  access_level: "viewer" | "editor";
  created_at: string;
  item_title: string;
  item_slug: string;
  item_visibility: string | null;
  is_banned: boolean;
}

// ─── Constants ────────────────────────────────────────────────

const ITEM_TYPE_ICONS: Record<string, string> = {
  folder: "📁",
  note: "📝",
};

// ─── Component ────────────────────────────────────────────────

export function DashboardCollaborators() {
  const { profile } = useAuth();
  const user = profile;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CollaboratorRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "folder" | "note">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Load data with server-side pagination ───────────────

  const loadData = useCallback(async (_currentSearch: string, currentType: "all" | "folder" | "note", currentPage: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const supabase = requireSupabase();

      // Count matching collaborators
      let countQuery = supabase
        .from("collaborators")
        .select("*", { count: "exact", head: true })
        .eq("inviter_id", user.id);
      
      if (currentType === "folder") countQuery = countQuery.not("folder_id", "is", null);
      if (currentType === "note") countQuery = countQuery.not("note_id", "is", null);

      const { count } = await countQuery;
      setTotalCount(count ?? 0);

      // Fetch paginated collaborators
      const from = (currentPage - 1) * PAGE_SIZE;
      let dataQuery = supabase
        .from("collaborators")
        .select(`
          *,
          folder:folders(title, slug, visibility),
          note:notes(title, slug, visibility)
        `)
        .eq("inviter_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (currentType === "folder") dataQuery = dataQuery.not("folder_id", "is", null);
      if (currentType === "note") dataQuery = dataQuery.not("note_id", "is", null);

      const { data: collaborators, error } = await dataQuery;
      if (error) throw error;

      // Map the joined data into flat rows
      const mapped: CollaboratorRow[] = (collaborators ?? []).map((c: Record<string, unknown>) => {
        const folder = Array.isArray(c.folder) && (c.folder as Array<Record<string, unknown>>).length > 0
          ? (c.folder as Array<Record<string, unknown>>)[0] as { title?: string; slug?: string; visibility?: string }
          : (c.folder as { title?: string; slug?: string; visibility?: string } | null);
        const note = Array.isArray(c.note) && (c.note as Array<Record<string, unknown>>).length > 0
          ? (c.note as Array<Record<string, unknown>>)[0] as { title?: string; slug?: string; visibility?: string }
          : (c.note as { title?: string; slug?: string; visibility?: string } | null);

        return {
          id: c.id as string,
          inviter_id: c.inviter_id as string,
          invitee_email: c.invitee_email as string,
          folder_id: (c.folder_id as string) ?? null,
          note_id: (c.note_id as string) ?? null,
          access_level: c.access_level as "viewer" | "editor",
          created_at: c.created_at as string,
          item_title: folder?.title ?? note?.title ?? "Unknown",
          item_slug: folder?.slug ?? note?.slug ?? "",
          item_visibility: folder?.visibility ?? note?.visibility ?? null,
          is_banned: false,
        };
      });

      setRows(mapped);
      setSelected(new Set()); // Clear selection on page change
    } catch (err) {
      console.error("Error loading collaborators:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, typeFilter]);
  useEffect(() => { void loadData(debouncedSearch, typeFilter, page); }, [page, debouncedSearch, typeFilter, loadData]);

  // ─── Derived ──────────────────────────────────────────────

  // Client-side search filter on current page (lightweight)
  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) =>
      r.invitee_email.toLowerCase().includes(q) ||
      r.item_title.toLowerCase().includes(q)
    );
  }, [rows, debouncedSearch]);

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  // ─── Actions ──────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  };

  const handleRemoveSelected = async () => {
    setRemoving(true);
    try {
      const supabase = requireSupabase();
      const ids = Array.from(selected);

      // Get the rows before deleting so we can log revocations
      const removedRows = rows.filter((r) => selected.has(r.id));

      const { error } = await supabase
        .from("collaborators")
        .delete()
        .in("id", ids);

      if (error) throw error;

      // Log revocations to activity log
      try {
        const logEntries = removedRows.map((row) => {
          const isFolder = !!row.folder_id;
          return {
            inviter_id: user?.id,
            invitee_email: row.invitee_email,
            action: "revoked",
            folder_id: row.folder_id,
            note_id: row.note_id,
            access_level: row.access_level,
            item_title: row.item_title,
            item_slug: row.item_slug,
            item_type: isFolder ? "folder" : "note",
          };
        });
        if (logEntries.length > 0) {
          await supabase.from("activity_log").insert(logEntries);
        }
      } catch (logErr) {
        console.error("Failed to log revocations:", logErr);
      }

      // Remove deleted from local state
      setRows((prev) => prev.filter((r) => !selected.has(r.id)));
      setSelected(new Set());
      setConfirmRemove(false);
    } catch (err) {
      console.error("Error removing collaborators:", err);
    } finally {
      setRemoving(false);
    }
  };

  const handleRemoveSingle = async (id: string) => {
    try {
      const supabase = requireSupabase();

      // Get the row before deleting so we can log the revocation
      const row = rows.find((r) => r.id === id);

      const { error } = await supabase
        .from("collaborators")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (row) {
        // Log revocation to activity log
        const isFolder = !!row.folder_id;
        try {
          await supabase.from("activity_log").insert({
            inviter_id: user?.id,
            invitee_email: row.invitee_email,
            action: "revoked",
            folder_id: row.folder_id,
            note_id: row.note_id,
            access_level: row.access_level,
            item_title: row.item_title,
            item_slug: row.item_slug,
            item_type: isFolder ? "folder" : "note",
          });
        } catch (logErr) {
          console.error("Failed to log revocation:", logErr);
        }
      }

      setRows((prev) => prev.filter((r) => r.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("Error removing collaborator:", err);
    }
  };

  // ─── Render: loading / no user ────────────────────────────

  if (!user || loading) {
    return (
      <DashboardLayout user={user || fallbackProfile()} variant="user">
        <div
          style={{
            padding: "var(--space-20)",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          Loading collaborators…
        </div>
      </DashboardLayout>
    );
  }

  // ─── Render ──────────────────────────────────────────────

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
            Collaborators
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {totalCount} collaborator{totalCount !== 1 ? "s" : ""} invited to your
            workspace
          </p>
        </div>
      </div>
      <Link to="/dashboard/activity">
        <Button variant="ghost" size="sm" style={{ marginBottom: "var(--space-4)" }}>
          View activity log →
        </Button>
      </Link>

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
          placeholder="Search by email or item name…"
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
          {(["all", "folder", "note"] as const).map((v) => (
            <Button
              key={v}
              variant={typeFilter === v ? "accent-ghost" : "secondary"}
              size="sm"
              onClick={() => setTypeFilter(v)}
              style={{ textTransform: "capitalize" }}
            >
              {v === "all" ? "All" : v === "folder" ? "Folders" : "Notes"}
            </Button>
          ))}
        </div>
      </div>

      {/* Batch actions bar */}
      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            marginBottom: "var(--space-4)",
            background: "var(--color-accent-subtle)",
            border: "1px solid var(--color-accent-muted)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-accent)",
          }}
        >
          <span>
            <strong>{selected.size}</strong> selected
          </span>
          <Button
            variant="danger"
            size="xs"
            onClick={() => setConfirmRemove(true)}
          >
            Remove selected
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 ? (
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
              gridTemplateColumns: "36px 1fr 180px 80px 100px 120px 100px",
              gap: "var(--space-4)",
              padding: "var(--space-3) var(--space-5)",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-bg-subtle)",
              alignItems: "center",
            }}
          >
            <div>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                style={{ cursor: "pointer" }}
              />
            </div>
            {["Email", "Item", "Type", "Access", "Invited", "Actions"].map(
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

          {filtered.map((row, i) => {
            const isFolder = !!row.folder_id;
            const itemPath = isFolder ? "folder" : "n";
            return (
              <div
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr 180px 80px 100px 120px 100px",
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
                {/* Checkbox */}
                <div>
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    style={{ cursor: "pointer" }}
                  />
                </div>

                {/* Email */}
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    color: row.is_banned ? "var(--color-danger)" : "var(--color-text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  {row.invitee_email}
                  {row.is_banned && (
                    <Badge
                      variant="danger"
                      style={{
                        fontSize: "9px",
                        padding: "1px 6px",
                        lineHeight: "14px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Banned
                    </Badge>
                  )}
                </span>

                {/* Item title */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    minWidth: 0,
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>
                    {ITEM_TYPE_ICONS[isFolder ? "folder" : "note"]}
                  </span>
                  {row.item_slug ? (
                    <a
                      href={`/${user?.username || "u"}/${itemPath}/${row.item_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-accent)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textDecoration: "none",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.textDecoration = "underline")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.textDecoration = "none")
                      }
                    >
                      {row.item_title}
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          marginLeft: "3px",
                          opacity: 0.4,
                          verticalAlign: "middle",
                          display: "inline",
                        }}
                      >
                        <path d="M7 17l9.2-9.2M17 17V7H7" />
                      </svg>
                    </a>
                  ) : (
                    <span
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {row.item_title}
                    </span>
                  )}
                </div>

                {/* Type */}
                <Badge variant="muted" style={{ textTransform: "capitalize" }}>
                  {isFolder ? "Folder" : "Note"}
                </Badge>

                {/* Access level */}
                <Badge
                  variant={row.access_level === "editor" ? "success" : "default"}
                  style={{ textTransform: "capitalize" }}
                >
                  {row.access_level}
                </Badge>

                {/* Invited date */}
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {formatDate(row.created_at)}
                </span>

                {/* Actions */}
                <div>
                  <Button
                    variant="danger"
                    size="xs"
                    onClick={() => handleRemoveSingle(row.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="👥"
          title={
            search || typeFilter !== "all"
              ? "No matching collaborators"
              : "No collaborators yet"
          }
          description={
            search || typeFilter !== "all"
              ? "Try adjusting your search or filter."
              : "Invite collaborators on your private folders and notes to see them here."
          }
        />
      )}

      {/* Confirm remove modal */}
      <Modal
        isOpen={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        width={360}
      >
        <h3
          style={{
            marginBottom: "var(--space-2)",
            fontSize: "var(--font-size-lg)",
            fontWeight: "var(--font-weight-bold)",
          }}
        >
          Remove {selected.size} collaborator{selected.size !== 1 ? "s" : ""}?
        </h3>
        <p
          style={{
            marginBottom: "var(--space-6)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-muted)",
          }}
        >
          They will lose access to the shared item. This action cannot be
          undone.
        </p>
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "flex-end",
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmRemove(false)}
            disabled={removing}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleRemoveSelected}
            disabled={removing}
          >
            {removing ? "Removing…" : "Remove"}
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
