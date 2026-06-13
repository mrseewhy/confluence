import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge, Button, EmptyState } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import styles from "@/styles/dashboard.module.css";
import { safeStr, safeArray } from "@/lib/safeParse";
import { formatDate, timeAgo } from "@/lib/helpers";

// ─── Types ────────────────────────────────────────────────────

interface ActivityEntry {
  id: string;
  inviteeEmail: string;
  itemTitle: string;
  itemSlug: string;
  itemType: "folder" | "note";
  accessLevel: string | null;
  createdAt: string;
  inviterName: string;
  action: "invited" | "revoked";
}

// ─── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 20;

const DATE_PRESETS = [
  { label: "All time", value: "all" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Custom", value: "custom" },
] as const;

type DatePreset = (typeof DATE_PRESETS)[number]["value"];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ─── Component ────────────────────────────────────────────────

export function DashboardActivityLog() {
  const { profile } = useAuth();
  const user = profile;

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "folder" | "note">("all");
  const [actionFilter, setActionFilter] = useState<"all" | "invited" | "revoked">("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [page, setPage] = useState(1);
  const csvLinkRef = useRef<HTMLAnchorElement>(null);
  const [copiedCsv, setCopiedCsv] = useState(false);

  // ─── Load data ────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const supabase = requireSupabase();

      // Fetch from activity_log table instead of collaborators
      const { data: logs, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("inviter_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const safeLogs = safeArray<Record<string, unknown>>(logs);
      const mapped: ActivityEntry[] = safeLogs.map((log) => ({
        id: safeStr(log.id),
        inviteeEmail: safeStr(log.invitee_email),
        itemTitle: safeStr(log.item_title, "Unknown"),
        itemSlug: safeStr(log.item_slug),
        itemType: (safeStr(log.item_type) as "folder" | "note") || "note",
        accessLevel: safeStr(log.access_level) || null,
        createdAt: safeStr(log.created_at),
        inviterName: user.full_name,
        action: (safeStr(log.action) as "invited" | "revoked") || "invited",
      }));

      setEntries(mapped);
    } catch (err) {
      console.error("Error loading activity log:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ─── Derived ──────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    const now = Date.now();
    const msDay = 86400000;
    let dateCutoff: number | null = null;
    if (datePreset === "7d") dateCutoff = now - 7 * msDay;
    else if (datePreset === "30d") dateCutoff = now - 30 * msDay;
    else if (datePreset === "90d") dateCutoff = now - 90 * msDay;

    return entries.filter((e) => {
      const matchesSearch =
        !q ||
        e.inviteeEmail.toLowerCase().includes(q) ||
        e.itemTitle.toLowerCase().includes(q) ||
        e.inviterName.toLowerCase().includes(q);

      const matchesType = typeFilter === "all" || e.itemType === typeFilter;
      const matchesAction = actionFilter === "all" || e.action === actionFilter;

      let matchesDate = true;
      if (datePreset !== "all" && datePreset !== "custom" && dateCutoff !== null) {
        const createdMs = new Date(e.createdAt).getTime();
        matchesDate = createdMs >= dateCutoff;
      } else if (datePreset === "custom") {
        const createdMs = new Date(e.createdAt).getTime();
        if (customStart) {
          matchesDate = createdMs >= new Date(customStart).getTime();
        }
        if (matchesDate && customEnd) {
          matchesDate = createdMs <= new Date(customEnd + "T23:59:59").getTime();
        }
      }

      return matchesSearch && matchesType && matchesAction && matchesDate;
    });
  }, [entries, search, typeFilter, actionFilter, datePreset, customStart, customEnd]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, actionFilter, datePreset, customStart, customEnd]);

  // ─── Monthly summary ──────────────────────────────────────

  const monthlySummary = useMemo(() => {
    const byMonth = new Map<string, { invited: number; revoked: number }>();
    for (const e of entries) {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const current = byMonth.get(key) || { invited: 0, revoked: 0 };
      if (e.action === "invited") current.invited++;
      else current.revoked++;
      byMonth.set(key, current);
    }
    // Convert to array and sort by month descending
    return Array.from(byMonth.entries())
      .map(([key, counts]) => {
        const [year, month] = key.split("-").map(Number);
        return {
          label: `${MONTHS_SHORT[month]} ${year}`,
          invited: counts.invited,
          revoked: counts.revoked,
          total: counts.invited + counts.revoked,
          sortKey: year * 12 + month,
        };
      })
      .sort((a, b) => b.sortKey - a.sortKey);
  }, [entries]);

  // ─── CSV export ──────────────────────────────────────────

  const buildCsvContent = useCallback(() => {
    const headers = ["Inviter", "Invitee Email", "Item", "Type", "Action", "Access Level", "Date"];
    const rows = filtered.map((e) => [
      e.inviterName,
      e.inviteeEmail,
      e.itemTitle,
      e.itemType,
      e.action,
      e.accessLevel || "-",
      formatDate(e.createdAt),
    ]);

    return [
      headers.join(","),
      ...rows.map((r) =>
        r
          .map((cell) => {
            const escaped = String(cell).replace(/"/g, '""');
            return escaped.includes(",") || escaped.includes('"') || escaped.includes("\n")
              ? `"${escaped}"`
              : escaped;
          })
          .join(","),
      ),
    ].join("\n");
  }, [filtered]);

  const exportCsv = useCallback(() => {
    const csvContent = buildCsvContent();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    if (csvLinkRef.current) {
      csvLinkRef.current.href = url;
      csvLinkRef.current.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
      csvLinkRef.current.click();
    }

    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [buildCsvContent]);

  const copyCsv = useCallback(async () => {
    const csvContent = buildCsvContent();
    try {
      await navigator.clipboard.writeText(csvContent);
      setCopiedCsv(true);
      setTimeout(() => setCopiedCsv(false), 2000);
    } catch {
      // Fallback: trigger download instead
      exportCsv();
    }
  }, [buildCsvContent, exportCsv]);

  // ─── Render: loading / no user ────────────────────────────

  if (!user || loading) {
    return (
      <DashboardLayout user={user || fallbackProfile()} variant="user">
        <div className={styles.loadingState}>
          Loading activity log…
        </div>
      </DashboardLayout>
    );
  }

  // ─── Render ──────────────────────────────────────────────

  return (
    <DashboardLayout user={user} variant="user">
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.headerTitle}>
            Activity Log
          </h1>
          <p className={styles.headerSubtitle}>
            Chronological history of collaborator invites and revocations
          </p>
        </div>
        <Link to="/dashboard/collaborators">
          <Button variant="secondary" size="sm">
            Manage collaborators →
          </Button>
        </Link>
      </div>

      {/* Monthly Summary Card */}
      {monthlySummary.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginBottom: "var(--space-6)",
            flexWrap: "wrap",
          }}
        >
          {monthlySummary.slice(0, 6).map((month) => {
            const maxInvites = monthlySummary[0]?.total || 1;
            const barWidth = (month.total / maxInvites) * 100;
            return (
              <div
                key={month.sortKey}
                style={{
                  flex: "1 0 130px",
                  minWidth: "110px",
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-3) var(--space-4)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 var(--space-2)",
                    fontSize: "11px",
                    fontWeight: "var(--font-weight-semibold)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {month.label}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-3)",
                    alignItems: "baseline",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--font-size-xl)",
                      fontWeight: "var(--font-weight-bold)",
                      color: "var(--color-text-primary)",
                      lineHeight: 1,
                    }}
                  >
                    {month.total}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    events
                  </span>
                </div>
                {month.revoked > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "var(--space-2)",
                      fontSize: "10px",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <span style={{ color: "var(--color-success)" }}>
                      +{month.invited} invites
                    </span>
                    <span style={{ color: "var(--color-danger)" }}>
                      −{month.revoked} revoked
                    </span>
                  </div>
                )}
                {month.revoked === 0 && (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--color-success)",
                    }}
                  >
                    +{month.invited} invites
                  </div>
                )}
                {/* Mini bar */}
                <div
                  style={{
                    marginTop: "var(--space-2)",
                    height: "4px",
                    background: "var(--color-bg-muted)",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      background: "var(--color-accent)",
                      borderRadius: "2px",
                      transition: "width var(--duration-normal)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          marginBottom: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        <input
          type="search"
          placeholder="Search by email, item name, or inviter…"
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
            e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)";
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
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {(["all", "invited", "revoked"] as const).map((v) => (
            <Button
              key={v}
              variant={actionFilter === v ? "accent-ghost" : "ghost"}
              size="sm"
              onClick={() => setActionFilter(v)}
              style={{ textTransform: "capitalize" }}
            >
              {v === "all" ? "All" : v === "invited" ? "Invites" : "Revoked"}
            </Button>
          ))}
        </div>
      </div>

      {/* Date range + Export */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          marginBottom: "var(--space-4)",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "var(--space-1)",
            alignItems: "center",
          }}
        >
          {DATE_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              variant={datePreset === preset.value ? "accent-ghost" : "ghost"}
              size="xs"
              onClick={() => setDatePreset(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {datePreset === "custom" && (
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              alignItems: "center",
            }}
          >
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-primary)",
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-1) var(--space-2)",
                outline: "none",
              }}
            />
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
              }}
            >
              →
            </span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-primary)",
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-1) var(--space-2)",
                outline: "none",
              }}
            />
          </div>
        )}

        <div style={{ flex: 1 }} />

        <Button
          variant="secondary"
          size="xs"
          onClick={copyCsv}
          disabled={filtered.length === 0}
        >
          {copiedCsv ? "Copied!" : "Copy CSV"}
        </Button>
        <Button
          variant="secondary"
          size="xs"
          onClick={exportCsv}
          disabled={filtered.length === 0}
        >
          Export CSV
        </Button>
      </div>

      {/* Hidden download link */}
      <a ref={csvLinkRef} style={{ display: "none" }} />

      {/* Results count */}
      <p
        style={{
          margin: "0 0 var(--space-4)",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-muted)",
        }}
      >
        {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        {filtered.length !== entries.length
          ? ` (filtered from ${entries.length})`
          : ""}
      </p>

      {/* Activity Feed */}
      {paginated.length > 0 ? (
        <div
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          {paginated.map((entry, i) => {
            const itemPath = entry.itemType === "folder" ? "folder" : "n";
            const isInvite = entry.action === "invited";
            return (
              <div
                key={entry.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr auto",
                  gap: "var(--space-4)",
                  alignItems: "center",
                  padding: "var(--space-4) var(--space-5)",
                  borderBottom:
                    i < paginated.length - 1
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
                {/* Icon */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "var(--radius-full)",
                    background: isInvite
                      ? "var(--color-success-subtle)"
                      : "var(--color-danger-subtle)",
                    color: isInvite ? "var(--color-success)" : "var(--color-danger)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  {isInvite ? "✓" : "✕"}
                </div>

                {/* Event description */}
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--font-size-sm)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--color-text-primary)",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>{entry.inviterName}</strong>{" "}
                    <span
                      style={{
                        color: isInvite ? "var(--color-success)" : "var(--color-danger)",
                        fontWeight: "var(--font-weight-semibold)",
                      }}
                    >
                      {isInvite ? "invited" : "revoked access for"}
                    </span>{" "}
                    <strong>{entry.inviteeEmail}</strong>
                    {entry.itemSlug ? (
                      <>
                        {" "}to{" "}
                        <a
                          href={`/${user.username || "u"}/${itemPath}/${entry.itemSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--color-accent)",
                            textDecoration: "none",
                            fontWeight: "var(--font-weight-semibold)",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.textDecoration = "underline")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.textDecoration = "none")
                          }
                        >
                          {entry.itemTitle}
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
                      </>
                    ) : (
                      <> to {entry.itemTitle}</>
                    )}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {timeAgo(entry.createdAt)} · {formatDate(entry.createdAt)}
                  </p>
                </div>

                {/* Badges */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    flexShrink: 0,
                  }}
                >
                  <Badge
                    variant={isInvite ? "success" : "danger"}
                    style={{ textTransform: "capitalize" }}
                  >
                    {entry.action}
                  </Badge>
                  <Badge variant="muted" style={{ textTransform: "capitalize" }}>
                    {entry.itemType}
                  </Badge>
                  {entry.accessLevel && (
                    <Badge
                      variant={entry.accessLevel === "editor" ? "accent" : "default"}
                      style={{ textTransform: "capitalize" }}
                    >
                      {entry.accessLevel}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="📋"
          title={
            search || typeFilter !== "all" || actionFilter !== "all"
              ? "No matching events"
              : "No activity yet"
          }
          description={
            search || typeFilter !== "all" || actionFilter !== "all"
              ? "Try adjusting your search or filters."
              : "When you invite or revoke collaborators, the activity will appear here."
          }
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "var(--space-4)",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
          }}
        >
          <span>
            Page {page} of {totalPages} ({filtered.length} total)
          </span>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                padding: "4px 10px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background:
                  page <= 1 ? "var(--color-bg-muted)" : "var(--color-bg-elevated)",
                color:
                  page <= 1
                    ? "var(--color-text-muted)"
                    : "var(--color-text-primary)",
                cursor: page <= 1 ? "default" : "pointer",
                fontSize: "11px",
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
              }}
            >
              ← Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: "4px 10px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background:
                  page >= totalPages
                    ? "var(--color-bg-muted)"
                    : "var(--color-bg-elevated)",
                color:
                  page >= totalPages
                    ? "var(--color-text-muted)"
                    : "var(--color-text-primary)",
                cursor: page >= totalPages ? "default" : "pointer",
                fontSize: "11px",
                fontFamily: "var(--font-sans)",

                fontWeight: 500,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
