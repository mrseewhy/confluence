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
import styles from "@/styles/admin.module.css";
import { safeStr } from "@/lib/safeParse";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { PaginationBar } from "@/components/PaginationBar";
import type { Folder } from "@/types";

interface SubfolderRow extends Folder {
  owner: { full_name: string } | null;
  parent: { title: string } | null;
}

function subfolderToSelect(f: SubfolderRow): SelectItem {
  return {
    id: f.id,
    primary: f.title,
    secondary: f.parent?.title || undefined,
    badge: f.visibility === "public" ? { label: "public", variant: "accent" } : { label: "private", variant: "muted" },
  };
}
// ===================================================================

const PAGE_SIZE = 20;

export function AdminSubfolders() {
  const { profile } = useAuth();
  const user = profile;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [subfolders, setSubfolders] = useState<SubfolderRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [collaboratorMap, setCollaboratorMap] = useState<Record<string, number>>({});
  const { search, setSearch, debouncedSearch } = useDebouncedSearch({ onSearchChange: () => setPage(1) });
  const [vis, setVis] = useState<"all" | "public" | "private">("all");
  const [page, setPage] = useState(1);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [visSelectedId, setVisSelectedId] = useState<string | null>(null);
  const [transferSelectedId, setTransferSelectedId] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const loadSubfolders = useCallback(async (currentSearch: string, currentVis: "all" | "public" | "private", currentPage: number) => {
    setLoading(true);
    try {
      const supabase = requireSupabase();
      
      let query = supabase
        .from("folders")
        .select("*, owner:profiles(full_name), parent:folders!parent_id(title)", { count: "exact" })
        .not("parent_id", "is", null);
      
      if (currentVis !== "all") {
        query = query.eq("visibility", currentVis);
      }
      if (currentSearch) {
        query = query.or(`title.ilike.%${currentSearch}%,description.ilike.%${currentSearch}%`);
      }
      
      const start = (currentPage - 1) * PAGE_SIZE;
      const { data: folders, count } = await query
        .order("updated_at", { ascending: false })
        .range(start, start + PAGE_SIZE - 1);
      
      if (folders) {
        setSubfolders(folders);
        setTotalCount(count || 0);
        // Load collaborator counts for returned folders
        const ids = folders.map((f: { id: string }) => f.id);
        if (ids.length > 0) {
          const { data: collabs } = await supabase
            .from("collaborators")
            .select("folder_id")
            .in("folder_id", ids);
          const map: Record<string, number> = {};
          (collabs || []).forEach((c: Record<string, unknown>) => {
            const fid = safeStr(c.folder_id);
            map[fid] = (map[fid] || 0) + 1;
          });
          setCollaboratorMap(map);
        }
      }
    } catch {
      addToast("Failed to load subfolders", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadSubfolders(debouncedSearch, vis, page); }, [page, debouncedSearch, vis, loadSubfolders]);

  // Reset transfer modal when selection changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setShowTransferModal(false); }, [transferSelectedId]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginated = subfolders;

  const getFolder = useCallback((id: string | null) => subfolders.find((f) => f.id === id), [subfolders]);

  const handleDelete = async (id: string) => {
    const target = getFolder(id);
    try {
      const supabase = requireSupabase();
      await supabase.from("folders").delete().eq("id", id);
      setSubfolders((prev) => prev.filter((f) => f.id !== id));
      addToast(`Subfolder "${target?.title}" deleted`, "success");
      void (async () => {
        try { await supabase.from("activity_log").insert({
          inviter_id: user!.id, invitee_email: "", action: "folder_deleted",
          item_type: "folder", item_title: target?.title || "Unknown",
          details: `Admin ${user?.full_name} deleted subfolder "${target?.title}"`,
        }); } catch { /* best-effort */ }
      })();
    } catch { addToast("Failed to delete subfolder", "error"); }
    setPendingDeleteId(null);
  };

  if (!user || loading) {
    return (
      <DashboardLayout user={user || fallbackProfile({ user_type: "admin" })} variant="admin">
        <div className={styles.loadingState}>Loading subfolders…</div>
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
              <Icon d={IC.subfolder} size={14} />
            </div>
            <h1 className={styles.headerTitle}>Subfolder Management</h1>
          </div>
          <p className={styles.headerSubtitle}>
            {subfolders.length} subfolder{subfolders.length !== 1 ? "s" : ""} across the platform · Manage visibility and ownership
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ALL SUBFOLDERS TABLE                                      */}
      {/* ========================================================= */}
      <Card className={styles.cardTable}>
        <div className={styles.cardHeader}>
          <div className={styles.cardFlexRow}>
            <div className={styles.cardFlexLeft}>
              <h2 className={styles.cardTitle}>All Subfolders</h2>
              <span className={styles.cardSubtitle}>
                {totalCount} of {subfolders.length} · Page {page} of {totalPages}
              </span>
            </div>
            <div className={styles.filterBtnGroup}>
              {(["all", "public", "private"] as const).map((v) => (
                <Button key={v} variant={vis === v ? "accent-ghost" : "secondary"} size="xs" onClick={() => { setVis(v); setPage(1); }} style={{ textTransform: "capitalize" }} aria-pressed={vis === v}>{v}</Button>
              ))}
            </div>
          </div>
          <input type="search" placeholder="Search subfolders by title or parent folder…" value={search} onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput} aria-label="Search subfolders" />
        </div>

        {paginated.length > 0 ? (
          <div>
            <div className={`${styles.tableHeader} ${styles.cols7_Wide}`}>
              {["Subfolder", "Parent", "Vis.", "Collabs", "Updated", "Owner", ""].map((h) => (
                <span className={styles.tableHeaderCell}>{h}</span>
              ))}
            </div>
            {paginated.map((folder) => (
              <div key={folder.id} className={`${styles.tableRow} ${styles.cols7_Wide}`}>
                <div className={styles.cellFlex}>
                  <div className={styles.iconBadge} style={{ background: "var(--color-bg-muted)", color: "var(--color-text-secondary)" }}>
                    <Icon d={IC.subfolder} size={15} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className={styles.cellText}>{folder.title}</p>
                    {folder.description && <p className={styles.cellTextSecondary}>{folder.description}</p>}
                  </div>
                </div>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.parent?.title ?? "—"}</span>
                <Badge variant={folder.visibility === "public" ? "accent" : "muted"}>{folder.visibility === "public" ? "Pub" : "Priv"}</Badge>
                <span style={{ fontSize: "var(--font-size-xs)", color: collaboratorMap[folder.id] ? "var(--color-text-secondary)" : "var(--color-text-muted)", textAlign: "center" }}>
                  {collaboratorMap[folder.id] || "—"}
                </span>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{formatDate(folder.updated_at)}</span>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.owner?.full_name || "—"}</span>
                <div className={styles.cellActions}>
                  <Button variant="danger" size="xs" onClick={() => setPendingDeleteId(folder.id)} aria-label={`Delete ${folder.title}`}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="📂" title="No subfolders found" description="Try adjusting your search or filters." action={
            <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setVis("all"); }}>Clear filters</Button>
          } />
        )}

        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalCount}
          onPageChange={setPage}
        />
      </Card>

      {/* ========================================================= */}
      {/* QUICK ACTION CARDS                                        */}
      {/* ========================================================= */}

      <h2 className={styles.sectionTitle}>Quick Actions</h2>

      <div className={styles.actionGrid}>
        {/* ── Visibility Toggle ── */}
        <ActionPanel title="Toggle Visibility" description="Switch a subfolder between public and private" icon={IC.globe} accent="accent">
          <ItemSelect items={subfolders.map(subfolderToSelect)} selectedId={visSelectedId} onSelect={setVisSelectedId} placeholder="Choose a subfolder…" />
          {visSelectedId && (() => {
            const target = getFolder(visSelectedId);
            if (!target) return null;
            return (
              <div className={styles.actionRow}>
                <span className={styles.actionLabel}>
                  <strong>{target.title}</strong> is{" "}
                  <Badge variant={target.visibility === "public" ? "accent" : "muted"}>{target.visibility}</Badge>
                </span>
                <Button variant={target.visibility === "public" ? "secondary" : "accent-ghost"} size="sm"
                  onClick={async () => {
                    const newVis = target.visibility === "public" ? "private" : "public";
                    try {
                      const supabase = requireSupabase();
                      await supabase.from("folders").update({ visibility: newVis }).eq("id", target.id);
                      setSubfolders((prev) => prev.map((f) => f.id === target.id ? { ...f, visibility: newVis } : f));
                      addToast(`"${target.title}" set to ${newVis}`, "success");
                      void (async () => {
                        try { await supabase.from("activity_log").insert({
                          inviter_id: user!.id, invitee_email: "", action: "visibility_changed",
                          item_type: "folder", item_title: target.title,
                          details: `Admin ${user?.full_name} changed subfolder "${target.title}" visibility to ${newVis}`,
                        }); } catch { /* best-effort */ }
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
        <ActionPanel title="Transfer Ownership" description="Reassign a subfolder to a different user" icon={IC.users} accent="warning">
          <ItemSelect items={subfolders.map(subfolderToSelect)} selectedId={transferSelectedId} onSelect={setTransferSelectedId} placeholder="Choose a subfolder to transfer…" />
          {transferSelectedId && (() => {
            const target = getFolder(transferSelectedId);
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
        const target = getFolder(transferSelectedId);
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
                await supabase.from("folders").update({ owner_id: newOwnerId }).eq("id", target.id);
                await loadSubfolders(debouncedSearch, vis, page);
                addToast(`"${target.title}" transferred to ${newOwnerName}`, "success");
                void (async () => {
                  try { await supabase.from("activity_log").insert({
                    inviter_id: user!.id, invitee_email: newOwnerEmail,
                    action: "ownership_transferred", item_type: "folder",
                    item_title: target.title,
                    details: `Admin ${user?.full_name} transferred subfolder "${target.title}" to ${newOwnerName}`,
                  }); } catch { /* best-effort */ }
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
        <h3 className={styles.modalTitle}>Delete subfolder?</h3>
        <p className={styles.modalBody}>
          This will permanently delete "{getFolder(pendingDeleteId)?.title}" and all its contents. This action cannot be undone.
        </p>
        <div className={styles.modalActions}>
          <Button variant="secondary" size="sm" onClick={() => setPendingDeleteId(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => pendingDeleteId && handleDelete(pendingDeleteId)}>Delete</Button>
        </div>
      </Modal>


    </DashboardLayout>
  );
}
