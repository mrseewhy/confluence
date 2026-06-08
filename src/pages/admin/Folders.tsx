import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { formatDate } from "@/lib/helpers";
import { useToast } from "@/components/Toast";
import type { Folder } from "@/types";

export function AdminFolders() {
  const { profile } = useAuth();
  const user = profile;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [allFolders, setAllFolders] = useState<
    Array<Folder & { owner: { full_name: string } | null }>
  >([]);
  const [search, setSearch] = useState("");
  const [vis, setVis] = useState<"all" | "public" | "private">("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const loadFolders = async () => {
    try {
      const supabase = requireSupabase();
      const { data: folders } = await supabase
        .from("folders")
        .select("*, owner:profiles(full_name)")
        .order("updated_at", { ascending: false });
      if (!folders) return;
      setAllFolders(folders);
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
      (f.title.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q)) &&
      (vis === "all" || f.visibility === vis)
    );
  });

  const handleDelete = async (id: string) => {
    const target = allFolders.find((f) => f.id === id);
    try {
      const supabase = requireSupabase();
      await supabase.from("folders").delete().eq("id", id);
      setAllFolders((prev) => prev.filter((f) => f.id !== id));
      addToast(`Folder "${target?.title}" deleted`, "success");
      void (async () => {
        try { await supabase.from("activity_log").insert({
          inviter_id: user!.id,
          invitee_email: "",
          action: "folder_deleted",
          item_type: "folder",
          item_title: target?.title || "Unknown",
          details: `Admin ${user?.full_name} deleted folder "${target?.title}"`,
        }); } catch {}
      })();
    } catch {
      addToast("Failed to delete folder", "error");
    }
    setPendingDeleteId(null);
  };

  const handleToggleVisibility = async (folder: Folder & { owner: { full_name: string } | null }) => {
    const newVis = folder.visibility === "public" ? "private" : "public";
    try {
      const supabase = requireSupabase();
      await supabase.from("folders").update({ visibility: newVis }).eq("id", folder.id);
      setAllFolders((prev) => prev.map((f) => f.id === folder.id ? { ...f, visibility: newVis as "public" | "private" } : f));
      addToast(`"${folder.title}" set to ${newVis}`, "success");
      void (async () => {
        try { await supabase.from("activity_log").insert({
          inviter_id: user!.id,
          invitee_email: "",
          action: "visibility_changed",
          item_type: "folder",
          item_title: folder.title,
          details: `Admin ${user?.full_name} changed folder "${folder.title}" visibility to ${newVis}`,
        }); } catch {}
      })();
    } catch {
      addToast("Failed to update visibility", "error");
    }
  };

  if (!user || loading) {
    return (
      <DashboardLayout user={user || fallbackProfile({ user_type: "admin" })} variant="admin">
        <div style={{ padding: "var(--space-20)", textAlign: "center", color: "var(--color-text-muted)" }}>
          Loading folders…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} variant="admin">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", letterSpacing: "var(--letter-spacing-tight)", marginBottom: "var(--space-1)" }}>
            All Folders
          </h1>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            {allFolders.length} folder{allFolders.length !== 1 ? "s" : ""} across the platform
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        <input type="search" placeholder="Search folders…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 220px", fontFamily: "var(--font-sans)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)", outline: "none" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.boxShadow = "none"; }} />
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {(["all", "public", "private"] as const).map((v) => (
            <Button key={v} variant={vis === v ? "accent-ghost" : "secondary"} size="sm" onClick={() => setVis(v)} style={{ textTransform: "capitalize" }}>{v}</Button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 90px 120px 180px", gap: "var(--space-4)", padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-subtle)" }}>
            {["Folder", "Type", "Visibility", "Updated", "Owner", "Actions"].map((h) => (
              <span key={h} style={{ fontSize: "11px", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>{h}</span>
            ))}
          </div>
          {filtered.map((folder, i) => (
            <div key={folder.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 90px 120px 180px", gap: "var(--space-4)", alignItems: "center", padding: "var(--space-4) var(--space-5)", borderBottom: i < filtered.length - 1 ? "1px solid var(--color-border-subtle)" : "none", transition: "background var(--duration-fast)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0 }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "var(--radius-lg)", background: folder.parent_id ? "var(--color-bg-muted)" : "var(--color-accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: folder.parent_id ? "var(--color-text-secondary)" : "var(--color-accent)", flexShrink: 0 }}>
                  <Icon d={folder.parent_id ? IC.subfolder : IC.folder} size={15} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.title}</p>
                  {folder.description && <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.description}</p>}
                </div>
              </div>
              <Badge variant={folder.parent_id ? "muted" : "default"}>{folder.parent_id ? "Sub" : "Root"}</Badge>
              <Badge variant={folder.visibility === "public" ? "accent" : "muted"}>{folder.visibility}</Badge>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{formatDate(folder.updated_at)}</span>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.owner?.full_name || "—"}</span>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <Button variant="accent-ghost" size="xs" onClick={() => handleToggleVisibility(folder)}>
                  {folder.visibility === "public" ? "Make private" : "Make public"}
                </Button>
                <Button variant="danger" size="xs" onClick={() => setPendingDeleteId(folder.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="📁" title="No folders found" description="Try adjusting your search or filters." />
      )}

      <Modal isOpen={!!pendingDeleteId} onClose={() => setPendingDeleteId(null)} width={360}>
        <h3 style={{ marginBottom: "var(--space-2)", fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)" }}>Delete folder?</h3>
        <p style={{ marginBottom: "var(--space-6)", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          This will permanently delete this folder and all its contents. This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <Button variant="secondary" size="sm" onClick={() => setPendingDeleteId(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => pendingDeleteId && handleDelete(pendingDeleteId)}>Delete</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
