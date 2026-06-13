import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge, EmptyState } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { formatDate } from "@/lib/helpers";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import styles from "@/styles/dashboard.module.css";
import { safeStr, safeArray } from "@/lib/safeParse";

// ─── Types ────────────────────────────────────────────────────

interface CollaborationRow {
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
  inviter_name: string;
  inviter_username: string | null;
  owner_name: string;
  owner_username: string | null;
}

const PAGE_SIZE = 20;

// ─── Component ────────────────────────────────────────────────

export function DashboardCollaborations() {
  const { profile } = useAuth();
  const user = profile;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CollaborationRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "folder" | "note">("all");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Load data with server-side pagination ────────────────

  const loadData = useCallback(async (_currentSearch: string, currentType: "all" | "folder" | "note", currentPage: number) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();

      // Get current user's email
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user?.email) {
        setRows([]);
        setError("Could not determine your email address.");
        return;
      }
      const email = authData.user.email;

      // Count matching collaborations
      let countQuery = supabase
        .from("collaborators")
        .select("*", { count: "exact", head: true })
        .eq("invitee_email", email);
      if (currentType === "folder") countQuery = countQuery.not("folder_id", "is", null);
      if (currentType === "note") countQuery = countQuery.not("note_id", "is", null);
      const { count } = await countQuery;
      setTotalCount(count ?? 0);

      // Fetch paginated collaborations
      const from = (currentPage - 1) * PAGE_SIZE;
      let dataQuery = supabase
        .from("collaborators")
        .select(`
          *,
          folder:folders!folder_id(title, slug, visibility, owner_id),
          note:notes!note_id(title, slug, visibility, owner_id),
          inviter:profiles!inviter_id(full_name, username, avatar_url)
        `)
        .eq("invitee_email", email)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (currentType === "folder") dataQuery = dataQuery.not("folder_id", "is", null);
      if (currentType === "note") dataQuery = dataQuery.not("note_id", "is", null);

      const { data: collaborators, error: collabError } = await dataQuery;
      if (collabError) throw collabError;

      // Collect unique owner IDs from returned items
      const ownerIds = new Set<string>();
      (collaborators ?? []).forEach((c: Record<string, unknown>) => {
        const folderArr = safeArray<Record<string, unknown>>(c.folder);
        const noteArr = safeArray<Record<string, unknown>>(c.note);
        const folder = folderArr.length > 0 ? folderArr[0] : null;
        const note = noteArr.length > 0 ? noteArr[0] : null;
        if (folder && safeStr(folder.owner_id)) ownerIds.add(safeStr(folder.owner_id));
        if (note && safeStr(note.owner_id)) ownerIds.add(safeStr(note.owner_id));
      });

      // Fetch owner names for returned items only
      let ownerMap: Record<string, { full_name: string; username: string | null }> = {};
      if (ownerIds.size > 0) {
        const { data: ownerProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", Array.from(ownerIds));
        if (ownerProfiles) {
          for (const p of ownerProfiles) {
            ownerMap[p.id] = { full_name: p.full_name, username: p.username };
          }
        }
      }

      const mapped: CollaborationRow[] = (collaborators ?? []).map((c: Record<string, unknown>) => {
        const folder2Arr = safeArray<Record<string, unknown>>(c.folder);
        const note2Arr = safeArray<Record<string, unknown>>(c.note);
        const inviterArr = safeArray<Record<string, unknown>>(c.inviter);
        const folder = folder2Arr.length > 0 ? folder2Arr[0] : null;
        const note = note2Arr.length > 0 ? note2Arr[0] : null;
        const inviter = inviterArr.length > 0 ? inviterArr[0] : null;

        const ownerId = folder ? safeStr(folder.owner_id) : note ? safeStr(note.owner_id) : "";
        const owner = ownerMap[ownerId];

        return {
          id: safeStr(c.id),
          inviter_id: safeStr(c.inviter_id),
          invitee_email: safeStr(c.invitee_email),
          folder_id: safeStr(c.folder_id) || null,
          note_id: safeStr(c.note_id) || null,
          access_level: (safeStr(c.access_level) as "viewer" | "editor") || "viewer",
          created_at: safeStr(c.created_at),
          item_title: folder ? safeStr(folder.title, "Unknown") : note ? safeStr(note.title, "Unknown") : "Unknown",
          item_slug: folder ? safeStr(folder.slug) : note ? safeStr(note.slug) : "",
          item_visibility: folder ? safeStr(folder.visibility) || null : note ? safeStr(note.visibility) || null : null,
          inviter_name: inviter ? safeStr(inviter.full_name, "Unknown") : "Unknown",
          inviter_username: inviter ? safeStr(inviter.username) || null : null,
          owner_name: owner?.full_name ?? "Unknown",
          owner_username: owner?.username ?? null,
        };
      });

      setRows(mapped);
    } catch (err) {
      console.error("Error loading collaborations:", err);
      setError("Failed to load collaborations.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, typeFilter]);
  useEffect(() => { void loadData(debouncedSearch, typeFilter, page); }, [page, debouncedSearch, typeFilter, loadData]);

  // ─── Derived — client-side search on current page ─────────

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) =>
      r.item_title.toLowerCase().includes(q) ||
      r.inviter_name.toLowerCase().includes(q)
    );
  }, [rows, debouncedSearch]);

  // Use totalCount from server for total pages, filtered for current page display
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginated = filtered;

  // ─── Render: loading / no user ────────────────────────────

  if (!user || loading) {
    return (
      <DashboardLayout user={user || fallbackProfile()} variant="user">
        <div className={styles.loadingState}>
          Loading collaborations…
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout user={user} variant="user">
        <EmptyState
          icon="⚠️"
          title="Something went wrong"
          description={error}
        />
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
            Collaborations
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {rows.length} item{rows.length !== 1 ? "s" : ""} shared with you
          </p>
        </div>
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
          placeholder="Search by item title or inviter…"
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
            <button
              key={v}
              onClick={() => setTypeFilter(v)}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${
                  typeFilter === v
                    ? "var(--color-accent-muted)"
                    : "var(--color-border)"
                }`,
                background:
                  typeFilter === v
                    ? "var(--color-accent-subtle)"
                    : "var(--color-bg-elevated)",
                color:
                  typeFilter === v
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all var(--duration-fast)",
              }}
              onMouseEnter={(e) => {
                if (typeFilter !== v) {
                  e.currentTarget.style.background = "var(--color-bg-muted)";
                }
              }}
              onMouseLeave={(e) => {
                if (typeFilter !== v) {
                  e.currentTarget.style.background = "var(--color-bg-elevated)";
                }
              }}
            >
              {v === "all" ? "All" : v === "folder" ? "Folders" : "Notes"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {paginated.map((row) => {
            const isFolder = !!row.folder_id;
            const itemPath = isFolder ? "folder" : "n";

            return (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-4)",
                  padding: "var(--space-4) var(--space-5)",
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  transition: "all var(--duration-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--color-border-strong)";
                  e.currentTarget.style.boxShadow =
                    "var(--shadow-sm)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--color-border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-bg-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  {isFolder ? "📁" : "📝"}
                </div>

                {/* Item info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      marginBottom: "2px",
                    }}
                  >
                    {row.item_slug ? (
                      <a
                        href={`/${row.inviter_username || "u"}/${itemPath}/${row.item_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "var(--font-size-sm)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--color-accent)",
                          textDecoration: "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.textDecoration = "underline")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.textDecoration = "none")
                        }
                      >
                        {row.item_title}
                      </a>
                    ) : (
                      <span
                        style={{
                          fontSize: "var(--font-size-sm)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {row.item_title}
                      </span>
                    )}
                    {row.item_visibility !== "private" && (
                      <Badge variant="muted" style={{ fontSize: "9px", padding: "0 6px", lineHeight: "16px" }}>
                        public
                      </Badge>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>Shared by <strong style={{ color: "var(--color-text-secondary)" }}>{row.inviter_name}</strong></span>
                    <span>·</span>
                    <span>Owned by <strong style={{ color: "var(--color-text-secondary)" }}>{row.owner_name}</strong></span>
                    <span>·</span>
                    <span>{formatDate(row.created_at)}</span>
                    <span>·</span>
                    <Badge
                      variant={row.access_level === "editor" ? "success" : "default"}
                      style={{ textTransform: "capitalize", fontSize: "10px", padding: "1px 8px", lineHeight: "18px" }}
                    >
                      {row.access_level === "editor" ? "Editor" : "Viewer"}
                    </Badge>
                  </div>
                </div>

                {/* Arrow */}
                <a
                  href={`/${row.inviter_username || "u"}/${itemPath}/${row.item_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--color-text-muted)",
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                    textDecoration: "none",
                    transition: "color var(--duration-fast)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--color-accent)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--color-text-muted)")
                  }
                >
                  <Icon d={IC.chevron} size={16} />
                </a>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="🔗"
          title={
            search || typeFilter !== "all"
              ? "No matching collaborations"
              : "No collaborations yet"
          }
          description={
            search || typeFilter !== "all"
              ? "Try adjusting your search or filter."
              : "When someone shares a folder or note with you, it will appear here."
          }
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-3)",
            marginTop: "var(--space-8)",
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
              transition: "all var(--duration-fast)",
            }}
          >
            ← Prev
          </button>
          <span
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-muted)",
            }}
          >
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-elevated)",
              color: page >= totalPages ? "var(--color-text-muted)" : "var(--color-text-primary)",
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              opacity: page >= totalPages ? 0.5 : 1,
              transition: "all var(--duration-fast)",
            }}
          >
            Next →
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
