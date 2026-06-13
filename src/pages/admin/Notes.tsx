import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button, EmptyState, Card } from "@/components/ui";
import { ActionPanel, ItemSelect, type SelectItem } from "@/components/admin";
import { Modal } from "@/components/Modal";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { formatDate } from "@/lib/helpers";
import { useToast } from "@/components/Toast";
import { TransferOwnershipModal } from "@/components/TransferOwnershipModal";
import { safeStr, safeArray } from "@/lib/safeParse";
import styles from "@/styles/admin.module.css";
import type { Visibility } from "@/types";

interface NoteRow {
  id: string;
  folder_id: string;
  owner_id: string;
  title: string;
  description: string | null;
  slug: string;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
  folder: { id: string; title: string; slug: string } | null;
  owner: { full_name: string } | null;
}

function noteToSelect(n: NoteRow): SelectItem {
  return {
    id: n.id,
    primary: n.title,
    secondary: n.folder?.title || undefined,
    badge: n.visibility === "public" ? { label: "public", variant: "accent" } : { label: "private", variant: "muted" },
  };
}
// ===================================================================

const PAGE_SIZE = 20;

export function AdminNotes() {
  const { profile } = useAuth();
  const user = profile;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [notesList, setNotesList] = useState<NoteRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [collaboratorMap, setCollaboratorMap] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vis, setVis] = useState<"all" | "public" | "private">("all");
  const [page, setPage] = useState(1);

  // Debounce search to avoid rapid API calls
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [visSelectedId, setVisSelectedId] = useState<string | null>(null);
  const [transferSelectedId, setTransferSelectedId] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const loadNotes = useCallback(async (currentSearch: string, currentVis: "all" | "public" | "private", currentPage: number) => {
    setLoading(true);
    try {
      const supabase = requireSupabase();
      
      let query = supabase
        .from("notes")
        .select("*, folder:folders(id, title, slug), owner:profiles!owner_id(full_name)", { count: "exact" });
      
      if (currentVis !== "all") {
        query = query.eq("visibility", currentVis);
      }
      if (currentSearch) {
        query = query.or(`title.ilike.%${currentSearch}%,description.ilike.%${currentSearch}%`);
      }
      
      const start = (currentPage - 1) * PAGE_SIZE;
      const { data, count } = await query
        .order("updated_at", { ascending: false })
        .range(start, start + PAGE_SIZE - 1);
      
      if (data) {
        const safeData = safeArray<Record<string, unknown>>(data);
        setNotesList(safeData as unknown as NoteRow[]);
        setTotalCount(count || 0);
        // Load collaborator counts for returned notes
        const ids = safeData.map((n) => safeStr(n.id));
        if (ids.length > 0) {
          const { data: collabs } = await supabase
            .from("collaborators")
            .select("note_id")
            .in("note_id", ids);
          const map: Record<string, number> = {};
          safeArray<Record<string, unknown>>(collabs).forEach((c) => {
            const nid = safeStr(c.note_id);
            map[nid] = (map[nid] || 0) + 1;
          });
          setCollaboratorMap(map);
        }
      }
    } catch (err) {
      console.error("Error loading notes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset to page 1 when search/vis changes, then load
  useEffect(() => { setPage(1); }, [debouncedSearch, vis]);
  useEffect(() => { void loadNotes(debouncedSearch, vis, page); }, [page, debouncedSearch, vis, loadNotes]);

  // Reset transfer modal when selection changes
  useEffect(() => { setShowTransferModal(false); }, [transferSelectedId]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginated = notesList;

  const getNote = useCallback((id: string | null) => notesList.find((n) => n.id === id), [notesList]);

  const handleDelete = async (id: string) => {
    const target = getNote(id);
    try {
      const supabase = requireSupabase();
      await supabase.from("notes").delete().eq("id", id);
      setNotesList((prev) => prev.filter((n) => n.id !== id));
      addToast(`Note "${target?.title}" deleted`, "success");
      void (async () => {
        try { await supabase.from("activity_log").insert({
          inviter_id: user!.id, invitee_email: "", action: "note_deleted",
          item_type: "note", item_title: target?.title || "Unknown",
          details: `Admin ${user?.full_name} deleted note "${target?.title}"`,
        }); } catch {}
      })();
    } catch { addToast("Failed to delete note", "error"); }
    setPendingDeleteId(null);
  };

  if (!user || loading) {
    return (
      <DashboardLayout user={user || fallbackProfile({ user_type: "admin" })} variant="admin">
        <div className={styles.loadingState}>Loading notes…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} variant="admin">
      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.headerTitleRow}>
            <div className={styles.headerIcon} style={{ background: "var(--color-warning-subtle)", border: "1px solid var(--color-warning)", color: "var(--color-warning)" }}>
              <Icon d={IC.notes} size={14} />
            </div>
            <h1 className={styles.headerTitle}>Note Management</h1>
          </div>
          <p className={styles.headerSubtitle}>
            {notesList.length} note{notesList.length !== 1 ? "s" : ""} across the platform · Manage visibility and ownership
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ALL NOTES TABLE                                           */}
      {/* ========================================================= */}
      <Card className={styles.cardTable}>
        <div className={styles.cardHeader}>
          <div className={styles.cardFlexRow}>
            <div className={styles.cardFlexLeft}>
              <h2 className={styles.cardTitle}>All Notes</h2>
              <span className={styles.cardSubtitle}>
                {totalCount} of {notesList.length} · Page {page} of {totalPages}
              </span>
            </div>
            <div className={styles.filterBtnGroup}>
              {(["all", "public", "private"] as const).map((v) => (
                <Button key={v} variant={vis === v ? "accent-ghost" : "secondary"} size="xs" onClick={() => setVis(v)} style={{ textTransform: "capitalize" }} aria-pressed={vis === v}>{v}</Button>
              ))}
            </div>
          </div>
          <input type="search" placeholder="Search notes by title, description, or folder…" value={search} onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput} aria-label="Search notes" />
        </div>

        {paginated.length > 0 ? (
          <div>
            <div className={`${styles.tableHeader} ${styles.cols7_Wide}`}>
              {["Note", "Folder", "Vis.", "Collabs", "Updated", "Owner", ""].map((h) => (
                <span className={styles.tableHeaderCell}>{h}</span>
              ))}
            </div>
            {paginated.map((note) => (
              <div key={note.id} className={`${styles.tableRow} ${styles.cols7_Wide}`}>
                <div className={styles.cellFlex}>
                  <div className={styles.iconBadge} style={{ background: "var(--color-accent-subtle)", color: "var(--color-accent)" }}>
                    <Icon d={IC.notes} size={15} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className={styles.cellText}>{note.title}</p>
                    {note.description && <p className={styles.cellTextSecondary}>{note.description}</p>}
                  </div>
                </div>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.folder?.title ?? "—"}</span>
                <Badge variant={note.visibility === "public" ? "accent" : "muted"}>{note.visibility === "public" ? "Pub" : "Priv"}</Badge>
                <span style={{ fontSize: "var(--font-size-xs)", color: collaboratorMap[note.id] ? "var(--color-text-secondary)" : "var(--color-text-muted)", textAlign: "center" }}>
                  {collaboratorMap[note.id] || "—"}
                </span>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{formatDate(note.updated_at)}</span>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.owner?.full_name || "—"}</span>
                <div className={styles.cellActions}>
                  <Button variant="danger" size="xs" onClick={() => setPendingDeleteId(note.id)} aria-label={`Delete ${note.title}`}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="📝" title="No notes found" description="Try adjusting your search or filters." action={
            <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setVis("all"); }}>Clear filters</Button>
          } />
        )}

        {totalPages > 1 && (
          <div className={styles.paginationBar}>
            <span>{totalCount} total · Page {page} of {totalPages}</span>
            <div className={styles.paginationBtnGroup}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={styles.paginationBtn} aria-label="Previous page">← Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={styles.paginationBtn} aria-label="Next page">Next →</button>
            </div>
          </div>
        )}
      </Card>

      {/* ========================================================= */}
      {/* QUICK ACTION CARDS                                        */}
      {/* ========================================================= */}

      <h2 className={styles.sectionTitle}>Quick Actions</h2>

      <div className={styles.actionGrid}>
        {/* ── Visibility Toggle ── */}
        <ActionPanel title="Toggle Visibility" description="Switch a note between public and private" icon={IC.globe} accent="accent">
          <ItemSelect items={notesList.map(noteToSelect)} selectedId={visSelectedId} onSelect={setVisSelectedId} placeholder="Choose a note…" />
          {visSelectedId && (() => {
            const target = getNote(visSelectedId);
            if (!target) return null;
            return (
              <div style={{ marginTop: "var(--space-3)", display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                  <strong>{target.title}</strong> is{" "}
                  <Badge variant={target.visibility === "public" ? "accent" : "muted"}>{target.visibility}</Badge>
                </span>
                <Button variant={target.visibility === "public" ? "secondary" : "accent-ghost"} size="sm"
                  onClick={async () => {
                    const newVis = target.visibility === "public" ? "private" : "public";
                    try {
                      const supabase = requireSupabase();
                      await supabase.from("notes").update({ visibility: newVis }).eq("id", target.id);
                      setNotesList((prev) => prev.map((n) => n.id === target.id ? { ...n, visibility: newVis } : n));
                      addToast(`"${target.title}" set to ${newVis}`, "success");
                      void (async () => {
                        try { await supabase.from("activity_log").insert({
                          inviter_id: user!.id, invitee_email: "", action: "visibility_changed",
                          item_type: "note", item_title: target.title,
                          details: `Admin ${user?.full_name} changed note "${target.title}" visibility to ${newVis}`,
                        }); } catch {}
                      })();
                    } catch { addToast("Failed to update visibility", "error"); }
                  }}
                >
                  Make {target.visibility === "public" ? "Private" : "Public"}
                </Button>
              </div>
            );
          })()}
        </ActionPanel>

        {/* ── Transfer Ownership ── */}
        <ActionPanel title="Transfer Ownership" description="Reassign a note to a different user" icon={IC.users} accent="warning">
          <ItemSelect items={notesList.map(noteToSelect)} selectedId={transferSelectedId} onSelect={setTransferSelectedId} placeholder="Choose a note to transfer…" />
          {transferSelectedId && (() => {
            const target = getNote(transferSelectedId);
            if (!target) return null;
            return (
              <div style={{ marginTop: "var(--space-3)", display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                  Current owner: <strong>{target.owner?.full_name || "Unknown"}</strong>
                </span>
                <Button variant="primary" size="sm" onClick={() => setShowTransferModal(true)}>
                  Transfer
                </Button>
              </div>
            );
          })()}
        </ActionPanel>
      </div>

      {/* ── Transfer Ownership modal ── */}
      {transferSelectedId && showTransferModal && (() => {
        const target = getNote(transferSelectedId);
        if (!target) return null;
        return (
          <TransferOwnershipModal
            isOpen={true}
            onClose={() => { setShowTransferModal(false); setTransferSelectedId(null); }}
            itemTitle={target.title}
            currentOwnerName={target.owner?.full_name || null}
            onTransfer={async (newOwnerId, newOwnerName, newOwnerEmail) => {
              try {
                const supabase = requireSupabase();
                await supabase.from("notes").update({ owner_id: newOwnerId }).eq("id", target.id);
                await loadNotes(debouncedSearch, vis, page);
                addToast(`"${target.title}" transferred to ${newOwnerName}`, "success");
                void (async () => {
                  try { await supabase.from("activity_log").insert({
                    inviter_id: user!.id, invitee_email: newOwnerEmail,
                    action: "ownership_transferred", item_type: "note",
                    item_title: target.title,
                    details: `Admin ${user?.full_name} transferred note "${target.title}" to ${newOwnerName}`,
                  }); } catch {}
                })();
              } catch { addToast("Failed to transfer ownership. Try again.", "error"); }
              setShowTransferModal(false);
              setTransferSelectedId(null);
            }}
          />
        );
      })()}

      {/* ── Delete modal ── */}
      <Modal isOpen={!!pendingDeleteId} onClose={() => setPendingDeleteId(null)} width={360}>
        <h3 className={styles.modalTitle}>Delete note?</h3>
        <p className={styles.modalBody}>
          This will permanently delete "{getNote(pendingDeleteId)?.title}" and all its blocks. This action cannot be undone.
        </p>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={() => setPendingDeleteId(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => pendingDeleteId && handleDelete(pendingDeleteId)}>Delete</Button>
        </div>
      </Modal>

    </DashboardLayout>
  );
}
