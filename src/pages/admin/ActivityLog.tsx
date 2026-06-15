import { useState, useEffect, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge, Button, EmptyState } from "@/components/ui";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { formatDate, timeAgo } from "@/lib/helpers";
import { safeStr, safeArray, safeJoin } from "@/lib/safeParse";
import styles from "@/styles/admin.module.css";

const PAGE_SIZE = 30;

const ACTIONS = [
  "invited", "revoked", "note_deleted", "folder_deleted",
  "visibility_changed", "ownership_transferred",
  "user_banned", "user_unbanned",
  "tier_changed", "user_promoted", "user_deleted",
] as const;

const DATE_PRESETS = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Custom", value: "custom" },
] as const;

type DatePreset = (typeof DATE_PRESETS)[number]["value"];

interface ActivityEntry {
  id: string;
  inviter_name: string;
  invitee_email: string;
  action: string;
  item_type: string;
  item_title: string;
  access_level: string | null;
  details: string | null;
  created_at: string;
}

export function AdminActivityLog() {
  const { profile } = useAuth();
  const user = profile;

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [page, setPage] = useState(1);
  const csvLinkRef = useRef<HTMLAnchorElement>(null);
  const [copiedCsv, setCopiedCsv] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = requireSupabase();
        // Join with profiles to resolve inviter_id UUID to full_name
        const { data: logs } = await supabase
          .from("activity_log")
          .select("*, inviter:profiles!inviter_id(full_name)")
          .order("created_at", { ascending: false })
          .limit(500);

        const rows = safeArray<Record<string, unknown>>(logs);
        const mapped: ActivityEntry[] = rows.map((row) => {
          const inviter = safeJoin<{ full_name?: string }>(row.inviter);
          return {
            id: safeStr(row.id),
            inviter_name: inviter?.full_name || safeStr(row.inviter_id).slice(0, 8) || "Unknown",
            invitee_email: safeStr(row.invitee_email),
            action: safeStr(row.action),
            item_type: safeStr(row.item_type),
            item_title: safeStr(row.item_title),
            access_level: safeStr(row.access_level) || null,
            details: safeStr(row.details) || null,
            created_at: safeStr(row.created_at),
          };
        });

        setEntries(mapped);
      } catch (err) {
        console.error("Error loading admin activity log:", err);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const msDay = 86400000;
    let dateCutoff: number | null = null;
    // eslint-disable-next-line react-hooks/purity
    const renderNow = Date.now();
    if (datePreset === "7d") dateCutoff = renderNow - 7 * msDay;
    else if (datePreset === "30d") dateCutoff = renderNow - 30 * msDay;
    else if (datePreset === "90d") dateCutoff = renderNow - 90 * msDay;

    return entries.filter((e) => {
      const matchesSearch = !q ||
        e.invitee_email.toLowerCase().includes(q) ||
        e.item_title.toLowerCase().includes(q) ||
        e.inviter_name.toLowerCase().includes(q) ||
        (e.details || "").toLowerCase().includes(q);

      const matchesAction = actionFilter === "all" || e.action === actionFilter;
      const matchesType = typeFilter === "all" || e.item_type === typeFilter;

      let matchesDate = true;
      if (datePreset !== "all" && datePreset !== "custom" && dateCutoff !== null) {
        matchesDate = new Date(e.created_at).getTime() >= dateCutoff;
      } else if (datePreset === "custom") {
        const createdMs = new Date(e.created_at).getTime();
        if (customStart) matchesDate = createdMs >= new Date(customStart).getTime();
        if (matchesDate && customEnd) matchesDate = createdMs <= new Date(customEnd + "T23:59:59").getTime();
      }

      return matchesSearch && matchesAction && matchesType && matchesDate;
    });
  }, [entries, search, actionFilter, typeFilter, datePreset, customStart, customEnd]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // CSV export
  const buildCsvContent = useMemo(() => {
    const headers = ["Admin", "Target Email", "Action", "Item Type", "Item Title", "Access Level", "Details", "Date"];
    const rows = filtered.map((e) => [
      e.inviter_name, e.invitee_email, e.action, e.item_type,
      e.item_title, e.access_level || "-", e.details || "-", formatDate(e.created_at),
    ]);
    return [headers.join(","), ...rows.map((r) => r.map((c) => {
      const s = String(c).replace(/"/g, '""');
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
    }).join(","))].join("\n");
  }, [filtered]);

  const exportCsv = () => {
    const blob = new Blob([buildCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    if (csvLinkRef.current) {
      csvLinkRef.current.href = url;
      csvLinkRef.current.download = `admin-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      csvLinkRef.current.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const copyCsv = async () => {
    try {
      await navigator.clipboard.writeText(buildCsvContent);
      setCopiedCsv(true);
      setTimeout(() => setCopiedCsv(false), 2000);
    } catch { exportCsv(); }
  };

  const getActionColor = (action: string): "success" | "danger" | "accent" | "warning" | "muted" | "default" => {
    if (action === "invited") return "success";
    if (action === "revoked" || action === "user_banned" || action === "user_deleted" || action === "note_deleted" || action === "folder_deleted") return "danger";
    if (action === "user_unbanned") return "accent";
    if (action === "user_promoted" || action === "tier_changed") return "warning";
    if (action === "visibility_changed") return "accent";
    if (action === "ownership_transferred") return "accent";
    return "default";
  };

  const getActionIcon = (action: string) => {
    if (action === "invited") return <span style={{ color: "var(--color-success)" }}>✓</span>;
    if (action === "revoked" || action === "user_deleted") return <span style={{ color: "var(--color-danger)" }}>✕</span>;
    if (action === "user_banned" || action === "user_unbanned") return <Icon d={IC.shield} size={14} />;
    if (action === "note_deleted" || action === "folder_deleted") return <Icon d={IC.notes} size={14} />;
    if (action === "visibility_changed") return <Icon d={IC.globe} size={14} />;
    if (action === "ownership_transferred") return <Icon d={IC.users} size={14} />;
    if (action === "user_promoted" || action === "tier_changed") return <Icon d={IC.users} size={14} />;
    return <span style={{ color: "var(--color-text-muted)" }}>•</span>;
  };

  // Stats
  const stats = useMemo(() => ({
    total: entries.length,
    invites: entries.filter((e) => e.action === "invited").length,
    deletions: entries.filter((e) => e.action.endsWith("_deleted")).length,
    bans: entries.filter((e) => e.action === "user_banned" || e.action === "user_unbanned").length,
    adminActions: entries.filter((e) => e.action === "user_promoted" || e.action === "tier_changed").length,
  }), [entries]);

  if (!user || loading) {
    return (
      <DashboardLayout user={user || fallbackProfile({ user_type: "admin" })} variant="admin">
        <div className={styles.loadingState}>
          Loading activity log…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} variant="admin">
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.headerTitle} style={{ marginBottom: "var(--space-1)" }}>
            Activity Log
          </h1>
          <p className={styles.headerSubtitle}>
            Chronological history of all platform activity across every user
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        {[
          { label: "Total events", value: stats.total, color: "var(--color-text-primary)" },
          { label: "Invites", value: stats.invites, color: "var(--color-success)" },
          { label: "Deletions", value: stats.deletions, color: "var(--color-danger)" },
          { label: "Ban actions", value: stats.bans, color: "var(--color-warning)" },
          { label: "Admin changes", value: stats.adminActions, color: "var(--color-accent)" },
        ].map((s) => (
          <div key={s.label} style={{ flex: "1 0 100px", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-3) var(--space-4)", textAlign: "center" }}>
            <p style={{ margin: "0 0 var(--space-1)", fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-bold)", color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
        <input type="search" placeholder="Search by email, item, or details…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className={styles.searchInput} style={{ flex: "1 1 220px" }} aria-label="Search activity log" />
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            style={{ fontFamily: "var(--font-sans)", fontSize: "var(--font-size-xs)", color: "var(--color-text-primary)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-1) var(--space-2)", outline: "none", cursor: "pointer" }}>
            <option value="all">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            style={{ fontFamily: "var(--font-sans)", fontSize: "var(--font-size-xs)", color: "var(--color-text-primary)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-1) var(--space-2)", outline: "none", cursor: "pointer" }}>
            <option value="all">All types</option>
            <option value="folder">Folder</option>
            <option value="note">Note</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      {/* Date + Export */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
          {DATE_PRESETS.map((preset) => (
            <Button key={preset.value} variant={datePreset === preset.value ? "accent-ghost" : "ghost"} size="xs" onClick={() => { setDatePreset(preset.value); setPage(1); }}>
              {preset.label}
            </Button>
          ))}
        </div>
        {datePreset === "custom" && (
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              style={{ fontFamily: "var(--font-sans)", fontSize: "var(--font-size-xs)", color: "var(--color-text-primary)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-1) var(--space-2)", outline: "none" }} />
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>→</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              style={{ fontFamily: "var(--font-sans)", fontSize: "var(--font-size-xs)", color: "var(--color-text-primary)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-1) var(--space-2)", outline: "none" }} />
          </div>
        )}
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="xs" onClick={copyCsv} disabled={filtered.length === 0}>
          {copiedCsv ? "Copied!" : "Copy CSV"}
        </Button>
        <Button variant="secondary" size="xs" onClick={exportCsv} disabled={filtered.length === 0}>
          Export CSV
        </Button>
      </div>

      <a ref={csvLinkRef} style={{ display: "none" }} />

      <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
        {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        {filtered.length !== entries.length ? ` (filtered from ${entries.length})` : ""}
      </p>

      {paginated.length > 0 ? (
        <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          {paginated.map((entry, i) => {
            const color = getActionColor(entry.action);
            return (
              <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "36px 1fr auto", gap: "var(--space-4)", alignItems: "center", padding: "var(--space-3) var(--space-5)", borderBottom: i < paginated.length - 1 ? "1px solid var(--color-border-subtle)" : "none", transition: "background var(--duration-fast)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-subtle)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <div style={{ width: "28px", height: "28px", borderRadius: "var(--radius-full)", background: `var(--color-${color}-subtle)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {getActionIcon(entry.action)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                    <strong>{entry.inviter_name}</strong>
                    {entry.invitee_email ? (
                      <> → <span style={{ color: "var(--color-accent)" }}>{entry.invitee_email}</span></>
                    ) : null}
                    {entry.details ? (
                      <> — <span style={{ color: "var(--color-text-secondary)" }}>{entry.details}</span></>
                    ) : null}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                    {timeAgo(entry.created_at)} · {formatDate(entry.created_at)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0, alignItems: "center" }}>
                  <Badge variant={color} style={{ textTransform: "capitalize", fontSize: "10px" }}>
                    {entry.action.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="muted" style={{ textTransform: "capitalize", fontSize: "10px" }}>
                    {entry.item_type}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="📋" title={search || actionFilter !== "all" ? "No matching events" : "No activity yet"}
          description={search || actionFilter !== "all" ? "Try adjusting your search or filters." : "Platform activity will appear here as users interact with the system."} />
      )}

      {totalPages > 1 && (
        <div className={styles.paginationBar} style={{ marginTop: "var(--space-4)" }}>
          <span>Page {page} of {totalPages} ({filtered.length} total)</span>
          <div className={styles.paginationBtnGroup}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={styles.paginationBtn} aria-label="Previous page">← Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={styles.paginationBtn} aria-label="Next page">Next →</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
