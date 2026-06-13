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
            const fid = c.folder_id as string;
            map[fid] = (map[fid] || 0) + 1;
          });
          setCollaboratorMap(map);
        }
      }
    } catch (err) {
      console.error("Error loading subfolders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset to page 1 when search/vis changes, then load
  useEffect(() => { setPage(1); }, [debouncedSearch, vis]);
  useEffect(() => { void loadSubfolders(debouncedSearch, vis, page); }, [page, debouncedSearch, vis, loadSubfolders]);

  // Reset transfer modal when selection changes
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
        }); } catch {}
      })();
    } catch { addToast("Failed to delete subfolder", "error"); }
    setPendingDeleteId(null);
  };

  if (!user || loading) {
    return (
      <DashboardLayout user={user || fallbackProfile({ user_type: "admin" })} variant="admin">
        <div style={{ padding: "var(--space-20)", textAlign: "center", color: "var(--color-text-muted)" }}>Loading subfolders…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} variant="admin">
      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-1)" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "var(--radius-md)", background: "var(--color-warning-subtle)", border: "1px solid var(--color-warning)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-warning)" }}>
              <Icon d={IC.subfolder} size={14} />
            </div>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", letterSpacing: "var(--letter-spacing-tight)", margin: 0 }}>Subfolder Management</h1>
          </div>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            {subfolders.length} subfolder{subfolders.length !== 1 ? "s" : ""} across the platform · Manage visibility and ownership
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ALL SUBFOLDERS TABLE                                      */}
      {/* ========================================================= */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: "var(--space-8)" }}>
        <div style={{ padding: "var(--space-5) var(--space-5) 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)", flexWrap: "wrap", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)", margin: 0 }}>All Subfolders</h2>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                {totalCount} of {subfolders.length} · Page {page} of {totalPages}
              </span>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {(["all", "public", "private"] as const).map((v) => (
                <Button key={v} variant={vis === v ? "accent-ghost" : "secondary"} size="xs" onClick={() => setVis(v)} style={{ textTransform: "capitalize" }}>{v}</Button>
              ))}
            </div>
          </div>
          <input type="search" placeholder="Search subfolders by title or parent folder…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", fontFamily: "var(--font-sans)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)", outline: "none", marginBottom: "var(--space-3)", boxSizing: "border-box" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.boxShadow = "none"; }} />
        </div>

        {paginated.length > 0 ? (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 60px 60px 90px 100px 80px", gap: "var(--space-3)", padding: "var(--space-3) var(--space-5)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-subtle)" }}>
              {["Subfolder", "Parent", "Vis.", "Collabs", "Updated", "Owner", ""].map((h) => (
                <span key={h} style={{ fontSize: "11px", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>{h}</span>
              ))}
            </div>
            {paginated.map((folder, i) => (
              <div key={folder.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 60px 60px 90px 100px 80px", gap: "var(--space-3)", alignItems: "center", padding: "var(--space-3) var(--space-5)", borderBottom: i < paginated.length - 1 ? "1px solid var(--color-border-subtle)" : "none", transition: "background var(--duration-fast)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-subtle)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0 }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "var(--radius-lg)", background: "var(--color-bg-muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)", flexShrink: 0 }}>
                    <Icon d={IC.subfolder} size={15} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.title}</p>
                    {folder.description && <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.description}</p>}
                  </div>
                </div>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.parent?.title ?? "—"}</span>
                <Badge variant={folder.visibility === "public" ? "accent" : "muted"}>{folder.visibility === "public" ? "Pub" : "Priv"}</Badge>
                <span style={{ fontSize: "var(--font-size-xs)", color: collaboratorMap[folder.id] ? "var(--color-text-secondary)" : "var(--color-text-muted)", textAlign: "center" }}>
                  {collaboratorMap[folder.id] || "—"}
                </span>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{formatDate(folder.updated_at)}</span>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.owner?.full_name || "—"}</span>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button variant="danger" size="xs" onClick={() => setPendingDeleteId(folder.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="📂" title="No subfolders found" description="Try adjusting your search or filters." action={
            <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setVis("all"); }}>Clear filters</Button>
          } />
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3) var(--space-5)", borderTop: "1px solid var(--color-border)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
            <span>{totalCount} total · Page {page} of {totalPages}</span>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                style={{ padding: "4px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: page <= 1 ? "var(--color-bg-muted)" : "var(--color-bg-elevated)", color: page <= 1 ? "var(--color-text-muted)" : "var(--color-text-primary)", cursor: page <= 1 ? "default" : "pointer", fontSize: "11px", fontFamily: "var(--font-sans)", fontWeight: 500 }}>← Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                style={{ padding: "4px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: page >= totalPages ? "var(--color-bg-muted)" : "var(--color-bg-elevated)", color: page >= totalPages ? "var(--color-text-muted)" : "var(--color-text-primary)", cursor: page >= totalPages ? "default" : "pointer", fontSize: "11px", fontFamily: "var(--font-sans)", fontWeight: 500 }}>Next →</button>
            </div>
          </div>
        )}
      </Card>

      {/* ========================================================= */}
      {/* QUICK ACTION CARDS                                        */}
      {/* ========================================================= */}

      <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)", margin: "0 0 var(--space-4)" }}>Quick Actions</h2>

      <div className="action-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
        {/* ── Visibility Toggle ── */}
        <ActionPanel title="Toggle Visibility" description="Switch a subfolder between public and private" icon={IC.globe} accent="accent">
          <ItemSelect items={subfolders.map(subfolderToSelect)} selectedId={visSelectedId} onSelect={setVisSelectedId} placeholder="Choose a subfolder…" />
          {visSelectedId && (() => {
            const target = getFolder(visSelectedId);
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
                      await supabase.from("folders").update({ visibility: newVis }).eq("id", target.id);
                      setSubfolders((prev) => prev.map((f) => f.id === target.id ? { ...f, visibility: newVis as "public" | "private" } : f));
                      addToast(`"${target.title}" set to ${newVis}`, "success");
                      void (async () => {
                        try { await supabase.from("activity_log").insert({
                          inviter_id: user!.id, invitee_email: "", action: "visibility_changed",
                          item_type: "folder", item_title: target.title,
                          details: `Admin ${user?.full_name} changed subfolder "${target.title}" visibility to ${newVis}`,
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
        <h3 style={{ marginBottom: "var(--space-2)", fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)" }}>Delete subfolder?</h3>
        <p style={{ marginBottom: "var(--space-6)", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          This will permanently delete "{getFolder(pendingDeleteId)?.title}" and all its contents. This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <Button variant="secondary" size="sm" onClick={() => setPendingDeleteId(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => pendingDeleteId && handleDelete(pendingDeleteId)}>Delete</Button>
        </div>
      </Modal>

      <style>{`@media (max-width: 768px) { .action-grid { grid-template-columns: 1fr !important; } }`}</style>
    </DashboardLayout>
  );
}
