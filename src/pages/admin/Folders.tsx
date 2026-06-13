import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button, EmptyState, Card } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { formatDate } from "@/lib/helpers";
import { useToast } from "@/components/Toast";
import { TransferOwnershipModal } from "@/components/TransferOwnershipModal";
import type { Folder } from "@/types";

interface FolderRow extends Folder {
  owner: { full_name: string } | null;
}

// ── Folder Selector (shared across action cards) ─────────────

function FolderSelect({
  folders,
  selectedId,
  onSelect,
  placeholder,
}: {
  folders: FolderRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = folders.find((f) => f.id === selectedId);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = query
    ? folders.filter((f) =>
        f.title.toLowerCase().includes(query.toLowerCase()),
      )
    : folders;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)",
          borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
          background: "var(--color-bg-elevated)",
          color: selected ? "var(--color-text-primary)" : "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)", fontFamily: "var(--font-sans)",
          cursor: "pointer", textAlign: "left", transition: "border-color var(--duration-fast)",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {selected ? `${selected.title}${selected.owner ? ` — ${selected.owner.full_name}` : ""}` : placeholder || "Select a folder…"}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
          background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)",
          maxHeight: "220px", overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          <input type="text" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
            style={{
              width: "100%", fontFamily: "var(--font-sans)", fontSize: "var(--font-size-sm)",
              color: "var(--color-text-primary)", background: "var(--color-bg-base)",
              border: "none", borderBottom: "1px solid var(--color-border)",
              padding: "var(--space-2) var(--space-3)", outline: "none", boxSizing: "border-box",
            }} />
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length > 0 ? filtered.map((f) => (
              <button key={f.id} type="button" onClick={() => { onSelect(f.id); setOpen(false); setQuery(""); }}
                style={{
                  display: "block", width: "100%", padding: "var(--space-2) var(--space-3)",
                  border: "none", background: f.id === selectedId ? "var(--color-accent-subtle)" : "transparent",
                  color: "var(--color-text-primary)", fontSize: "var(--font-size-sm)",
                  textAlign: "left", cursor: "pointer", fontFamily: "var(--font-sans)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-muted)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = f.id === selectedId ? "var(--color-accent-subtle)" : "transparent")}>
                <div style={{ fontWeight: "var(--font-weight-medium)" }}>{f.title}</div>
                <div style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", gap: "var(--space-2)" }}>
                  <span>{f.owner?.full_name || "—"}</span>
                  <Badge variant={f.visibility === "public" ? "accent" : "muted"} style={{ fontSize: "9px" }}>{f.visibility}</Badge>
                </div>
              </button>
            )) : (
              <p style={{ padding: "var(--space-4) var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textAlign: "center", margin: 0 }}>
                No folders match "{query}"
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Action Panel wrapper ─────────────────────────────────────

function ActionPanel({ title, description, icon, accent, children }: {
  title: string; description: string; icon: string;
  accent: "warning" | "accent" | "danger" | "default";
  children: React.ReactNode;
}) {
  const accentColors: Record<string, { border: string; bg: string; icon: string }> = {
    warning: { border: "var(--color-warning)", bg: "var(--color-warning-subtle)", icon: "var(--color-warning)" },
    accent:  { border: "var(--color-accent-muted)", bg: "var(--color-accent-subtle)", icon: "var(--color-accent)" },
    danger:  { border: "var(--color-danger)", bg: "var(--color-danger-subtle)", icon: "var(--color-danger)" },
    default: { border: "var(--color-border)", bg: "var(--color-bg-muted)", icon: "var(--color-text-secondary)" },
  };
  const c = accentColors[accent];
  return (
    <Card style={{ padding: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <div style={{ width: "34px", height: "34px", borderRadius: "var(--radius-lg)", background: c.bg, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: c.icon, flexShrink: 0 }}>
          <Icon d={icon} size={15} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)" }}>{title}</h3>
          <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{description}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

// ===================================================================
// AdminFolders Page
// ===================================================================

const PAGE_SIZE = 20;

export function AdminFolders() {
  const { profile } = useAuth();
  const user = profile;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [allFolders, setAllFolders] = useState<FolderRow[]>([]);
  const [search, setSearch] = useState("");
  const [vis, setVis] = useState<"all" | "public" | "private">("all");
  const [page, setPage] = useState(1);

  // Modal state
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Action card states
  const [visSelectedId, setVisSelectedId] = useState<string | null>(null);
  const [transferItem, setTransferItem] = useState<{ id: string; title: string; ownerName: string | null } | null>(null);

  const loadFolders = async () => {
    try {
      const supabase = requireSupabase();
      const { data: folders } = await supabase
        .from("folders")
        .select("*, owner:profiles(full_name)")
        .order("updated_at", { ascending: false });
      if (folders) setAllFolders(folders);
    } catch (err) {
      console.error("Error loading folders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadFolders(); }, []);

  const filtered = allFolders.filter((f) => {
    const q = search.toLowerCase();
    return (
      (f.title.toLowerCase().includes(q) || (f.description ?? "").toLowerCase().includes(q)) &&
      (vis === "all" || f.visibility === vis)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, vis]);

  const getFolder = (id: string | null) => allFolders.find((f) => f.id === id);

  const handleDelete = async (id: string) => {
    const target = getFolder(id);
    try {
      const supabase = requireSupabase();
      await supabase.from("folders").delete().eq("id", id);
      setAllFolders((prev) => prev.filter((f) => f.id !== id));
      addToast(`Folder "${target?.title}" deleted`, "success");
      void (async () => {
        try { await supabase.from("activity_log").insert({
          inviter_id: user!.id, invitee_email: "", action: "folder_deleted",
          item_type: "folder", item_title: target?.title || "Unknown",
          details: `Admin ${user?.full_name} deleted folder "${target?.title}"`,
        }); } catch {}
      })();
    } catch {
      addToast("Failed to delete folder", "error");
    }
    setPendingDeleteId(null);
  };

  if (!user || loading) {
    return (
      <DashboardLayout user={user || fallbackProfile({ user_type: "admin" })} variant="admin">
        <div style={{ padding: "var(--space-20)", textAlign: "center", color: "var(--color-text-muted)" }}>Loading folders…</div>
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
              <Icon d={IC.folder} size={14} />
            </div>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", letterSpacing: "var(--letter-spacing-tight)", margin: 0 }}>Folder Management</h1>
          </div>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            {allFolders.length} folder{allFolders.length !== 1 ? "s" : ""} across the platform · Manage visibility and ownership
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ALL FOLDERS TABLE                                         */}
      {/* ========================================================= */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: "var(--space-8)" }}>
        <div style={{ padding: "var(--space-5) var(--space-5) 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)", flexWrap: "wrap", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)", margin: 0 }}>All Folders</h2>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                {filtered.length} of {allFolders.length} · Page {page} of {totalPages}
              </span>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {(["all", "public", "private"] as const).map((v) => (
                <Button key={v} variant={vis === v ? "accent-ghost" : "secondary"} size="xs" onClick={() => setVis(v)} style={{ textTransform: "capitalize" }}>{v}</Button>
              ))}
            </div>
          </div>
          <input type="search" placeholder="Search folders by title…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", fontFamily: "var(--font-sans)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)", outline: "none", marginBottom: "var(--space-3)", boxSizing: "border-box" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.boxShadow = "none"; }} />
        </div>

        {paginated.length > 0 ? (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px 90px 100px 80px", gap: "var(--space-3)", padding: "var(--space-3) var(--space-5)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-subtle)" }}>
              {["Folder", "Type", "Vis.", "Updated", "Owner", ""].map((h) => (
                <span key={h} style={{ fontSize: "11px", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>{h}</span>
              ))}
            </div>
            {paginated.map((folder, i) => (
              <div key={folder.id} style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px 90px 100px 80px", gap: "var(--space-3)", alignItems: "center", padding: "var(--space-3) var(--space-5)", borderBottom: i < paginated.length - 1 ? "1px solid var(--color-border-subtle)" : "none", transition: "background var(--duration-fast)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-subtle)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0 }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "var(--radius-lg)", background: "var(--color-accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-accent)", flexShrink: 0 }}>
                    <Icon d={IC.folder} size={15} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.title}</p>
                    {folder.description && <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.description}</p>}
                  </div>
                </div>
                <Badge variant="muted">Root</Badge>
                <Badge variant={folder.visibility === "public" ? "accent" : "muted"}>{folder.visibility === "public" ? "Pub" : "Priv"}</Badge>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{formatDate(folder.updated_at)}</span>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.owner?.full_name || "—"}</span>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button variant="danger" size="xs" onClick={() => setPendingDeleteId(folder.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="📁" title="No folders found" description="Try adjusting your search or filters." action={
            <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setVis("all"); }}>Clear filters</Button>
          } />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3) var(--space-5)", borderTop: "1px solid var(--color-border)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
            <span>{filtered.length} total · Page {page} of {totalPages}</span>
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
        <ActionPanel title="Toggle Visibility" description="Switch a folder between public and private" icon={IC.globe} accent="accent">
          <FolderSelect folders={allFolders} selectedId={visSelectedId} onSelect={setVisSelectedId} placeholder="Choose a folder…" />
          {visSelectedId && (() => {
            const target = getFolder(visSelectedId);
            if (!target) return null;
            return (
              <div style={{ marginTop: "var(--space-3)", display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                  <strong>{target.title}</strong> is{" "}
                  <Badge variant={target.visibility === "public" ? "accent" : "muted"}>{target.visibility}</Badge>
                </span>
                <Button
                  variant={target.visibility === "public" ? "secondary" : "accent-ghost"}
                  size="sm"
                  onClick={async () => {
                    const newVis = target.visibility === "public" ? "private" : "public";
                    try {
                      const supabase = requireSupabase();
                      await supabase.from("folders").update({ visibility: newVis }).eq("id", target.id);
                      setAllFolders((prev) => prev.map((f) => f.id === target.id ? { ...f, visibility: newVis as "public" | "private" } : f));
                      addToast(`"${target.title}" set to ${newVis}`, "success");
                      void (async () => {
                        try { await supabase.from("activity_log").insert({
                          inviter_id: user!.id, invitee_email: "", action: "visibility_changed",
                          item_type: "folder", item_title: target.title,
                          details: `Admin ${user?.full_name} changed folder "${target.title}" visibility to ${newVis}`,
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
        <ActionPanel title="Transfer Ownership" description="Reassign a folder to a different user" icon={IC.users} accent="warning">
          <FolderSelect folders={allFolders} selectedId={transferItem?.id || null} onSelect={(id) => {
            const f = getFolder(id);
            if (f) setTransferItem({ id: f.id, title: f.title, ownerName: f.owner?.full_name || null });
          }} placeholder="Choose a folder to transfer…" />
          {transferItem && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                Current owner: <strong>{transferItem.ownerName || "Unknown"}</strong>
              </p>
              <TransferOwnershipModal
                isOpen={true}
                onClose={() => setTransferItem(null)}
                itemTitle={transferItem.title}
                currentOwnerName={transferItem.ownerName}
                onTransfer={async (newOwnerId, newOwnerName, newOwnerEmail) => {
                  try {
                    const supabase = requireSupabase();
                    await supabase.from("folders").update({ owner_id: newOwnerId }).eq("id", transferItem.id);
                    await loadFolders();
                    setVisSelectedId(null);
                    addToast(`"${transferItem.title}" transferred to ${newOwnerName}`, "success");
                    void (async () => {
                      try { await supabase.from("activity_log").insert({
                        inviter_id: user!.id, invitee_email: newOwnerEmail,
                        action: "ownership_transferred", item_type: "folder",
                        item_title: transferItem.title,
                        details: `Admin ${user?.full_name} transferred folder "${transferItem.title}" to ${newOwnerName}`,
                      }); } catch {}
                    })();
                  } catch { addToast("Failed to transfer ownership. Try again.", "error"); }
                  setTransferItem(null);
                }}
              />
            </div>
          )}
        </ActionPanel>
      </div>

      {/* ── Delete modal ── */}
      <Modal isOpen={!!pendingDeleteId} onClose={() => setPendingDeleteId(null)} width={360}>
        <h3 style={{ marginBottom: "var(--space-2)", fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)" }}>Delete folder?</h3>
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
