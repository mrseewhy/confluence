import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button, EmptyState, Card } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { formatDate } from "@/lib/helpers";

const TIERS = ["free", "bronze", "silver", "gold"] as const;

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  user_type: "user" | "admin";
  subscription_tier: string;
  is_banned: boolean;
  created_at: string;
  notes_count: number;
  folders_count: number;
}

// ── User Selector (shared across action cards) ────────────────

function UserSelect({
  users,
  selectedId,
  onSelect,
  placeholder,
}: {
  users: UserRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = users.find((u) => u.id === selectedId);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = query
    ? users.filter(
        (u) =>
          u.full_name.toLowerCase().includes(query.toLowerCase()) ||
          u.email.toLowerCase().includes(query.toLowerCase()),
      )
    : users;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-3)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
          background: "var(--color-bg-elevated)",
          color: selected
            ? "var(--color-text-primary)"
            : "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)",
          fontFamily: "var(--font-sans)",
          cursor: "pointer",
          textAlign: "left",
          transition: "border-color var(--duration-fast)",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {selected ? `${selected.full_name} (${selected.email})` : placeholder || "Select a user…"}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            maxHeight: "220px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <input
            type="text"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-primary)",
              background: "var(--color-bg-base)",
              border: "none",
              borderBottom: "1px solid var(--color-border)",
              padding: "var(--space-2) var(--space-3)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length > 0 ? (
              filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onSelect(u.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "var(--space-2) var(--space-3)",
                    border: "none",
                    background:
                      u.id === selectedId
                        ? "var(--color-accent-subtle)"
                        : "transparent",
                    color: "var(--color-text-primary)",
                    fontSize: "var(--font-size-sm)",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "var(--color-bg-muted)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      u.id === selectedId
                        ? "var(--color-accent-subtle)"
                        : "transparent")
                  }
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span style={{ fontWeight: "var(--font-weight-medium)" }}>
                      {u.full_name}
                    </span>
                    <Badge variant={u.user_type === "admin" ? "warning" : "muted"} style={{ fontSize: "9px" }}>
                      {u.user_type}
                    </Badge>
                  </div>
                  <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                    {u.email}
                  </span>
                </button>
              ))
            ) : (
              <p
                style={{
                  padding: "var(--space-4) var(--space-3)",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                No users match "{query}"
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Action Panel wrapper ─────────────────────────────────────

function ActionPanel({
  title,
  description,
  icon,
  accent,
  children,
}: {
  title: string;
  description: string;
  icon: string;
  accent: "warning" | "accent" | "danger" | "default";
  children: React.ReactNode;
}) {
  const accentColors: Record<string, { border: string; bg: string; icon: string }> = {
    warning: {
      border: "var(--color-warning)",
      bg: "var(--color-warning-subtle)",
      icon: "var(--color-warning)",
    },
    accent: {
      border: "var(--color-accent-muted)",
      bg: "var(--color-accent-subtle)",
      icon: "var(--color-accent)",
    },
    danger: {
      border: "var(--color-danger)",
      bg: "var(--color-danger-subtle)",
      icon: "var(--color-danger)",
    },
    default: {
      border: "var(--color-border)",
      bg: "var(--color-bg-muted)",
      icon: "var(--color-text-secondary)",
    },
  };
  const c = accentColors[accent];

  return (
    <Card style={{ padding: "var(--space-5)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          marginBottom: "var(--space-4)",
        }}
      >
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "var(--radius-lg)",
            background: c.bg,
            border: `1px solid ${c.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: c.icon,
            flexShrink: 0,
          }}
        >
          <Icon d={icon} size={15} />
        </div>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
            }}
          >
            {description}
          </p>
        </div>
      </div>
      {children}
    </Card>
  );
}

// ===================================================================
// Main AdminUsers Page
// ===================================================================

export function AdminUsers() {
  const { profile } = useAuth();
  const user = profile;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "user">("all");

  // Modal states
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Action card selected users
  const [banSelectedId, setBanSelectedId] = useState<string | null>(null);
  const [tierSelectedId, setTierSelectedId] = useState<string | null>(null);
  const [roleSelectedId, setRoleSelectedId] = useState<string | null>(null);
  const [passwordSelectedId, setPasswordSelectedId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      const supabase = requireSupabase();
      const { data: usersWithEmail, error: rpcError } = await supabase.rpc("admin_get_users");
      if (rpcError) throw rpcError;

      const { data: notesData } = await supabase.from("notes").select("owner_id");
      const { data: foldersData } = await supabase.from("folders").select("owner_id");

      const noteCounts: Record<string, number> = {};
      const folderCounts: Record<string, number> = {};
      (notesData || []).forEach((n) => { noteCounts[n.owner_id] = (noteCounts[n.owner_id] || 0) + 1; });
      (foldersData || []).forEach((f) => { folderCounts[f.owner_id] = (folderCounts[f.owner_id] || 0) + 1; });

      const rows: UserRow[] = (usersWithEmail || []).map((p: Record<string, unknown>) => ({
        id: (p.user_id as string) || (p.id as string),
        email: (p.user_email as string) || (p.email as string) || "",
        full_name: (p.user_full_name as string) || (p.full_name as string),
        avatar_url: (p.user_avatar_url as string) || (p.avatar_url as string) || null,
        user_type: p.user_type as "user" | "admin",
        subscription_tier: p.subscription_tier as string,
        is_banned: p.is_banned as boolean,
        created_at: p.created_at as string,
        notes_count: noteCounts[(p.user_id as string) || (p.id as string)] || 0,
        folders_count: folderCounts[(p.user_id as string) || (p.id as string)] || 0,
      }));

      setUsersList(rows);
    } catch (err) {
      console.error("Error loading users:", err);
      addToast("Failed to load users. Try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  // ── Helpers ──

  const getUser = (id: string | null) => usersList.find((u) => u.id === id);

  const logActivity = useCallback(
    async (targetEmail: string, targetName: string, action: string, details: string) => {
      try {
        const supabase = requireSupabase();
        await supabase.from("activity_log").insert({
          inviter_id: user!.id,
          invitee_email: targetEmail,
          action,
          item_type: "user",
          item_title: targetName || "Unknown",
          details,
        });
      } catch { /* fire-and-forget */ }
    },
    [user],
  );

  const filtered = usersList.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (filter === "all" || u.user_type === filter)
    );
  });

  // ── Loading state ──

  if (!user || loading) {
    return (
      <DashboardLayout user={user || fallbackProfile({ user_type: "admin" })} variant="admin">
        <div style={{ padding: "var(--space-20)", textAlign: "center", color: "var(--color-text-muted)" }}>
          Loading users…
        </div>
      </DashboardLayout>
    );
  }

  // =============================================================
  // RENDER
  // =============================================================

  return (
    <DashboardLayout user={user} variant="admin">
      {/* ── Page header ── */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-1)" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "var(--radius-md)",
              background: "var(--color-warning-subtle)", border: "1px solid var(--color-warning)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-warning)",
            }}>
              <Icon d={IC.shield} size={14} />
            </div>
            <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-bold)", letterSpacing: "var(--letter-spacing-tight)", margin: 0 }}>
              User Management
            </h1>
          </div>
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            {usersList.length} registered user{usersList.length !== 1 ? "s" : ""} · Full control over accounts, roles, and access
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: ALL USERS — clean table with delete only      */}
      {/* ========================================================= */}

      <Card style={{ padding: 0, overflow: "hidden", marginBottom: "var(--space-8)" }}>
        <div style={{ padding: "var(--space-5) var(--space-5) 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)", flexWrap: "wrap", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)", margin: 0 }}>
                All Users
              </h2>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                {filtered.length} of {usersList.length}
              </span>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {(["all", "admin", "user"] as const).map((v) => (
                <Button key={v} variant={filter === v ? "accent-ghost" : "secondary"} size="xs" onClick={() => setFilter(v)} style={{ textTransform: "capitalize" }}>
                  {v}
                </Button>
              ))}
            </div>
          </div>
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", fontFamily: "var(--font-sans)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)",
              background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)",
              padding: "var(--space-2) var(--space-3)", outline: "none", marginBottom: "var(--space-3)", boxSizing: "border-box",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>

        {filtered.length > 0 ? (
          <div>
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 80px 70px 60px 60px 110px 60px",
                gap: "var(--space-3)",
                padding: "var(--space-3) var(--space-5)",
                borderTop: "1px solid var(--color-border)",
                borderBottom: "1px solid var(--color-border)",
                background: "var(--color-bg-subtle)",
              }}
            >
              {["User", "Email", "Plan", "Status", "Notes", "Folders", "Joined", ""].map((h) => (
                <span key={h} style={{ fontSize: "11px", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Table rows */}
            {filtered.map((u, i) => (
              <div
                key={u.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 80px 70px 60px 60px 110px 60px",
                  gap: "var(--space-3)",
                  alignItems: "center",
                  padding: "var(--space-3) var(--space-5)",
                  borderBottom: i < filtered.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
                  background: u.is_banned ? "var(--color-danger-subtle)" : "transparent",
                  transition: "background var(--duration-fast)",
                }}
                onMouseEnter={(e) => { if (!u.is_banned) e.currentTarget.style.background = "var(--color-bg-subtle)"; }}
                onMouseLeave={(e) => { if (!u.is_banned) e.currentTarget.style.background = "transparent"; }}
              >
                {/* User avatar + name */}
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0 }}>
                  <div
                    style={{
                      width: "32px", height: "32px", borderRadius: "var(--radius-full)",
                      background: u.user_type === "admin" ? "var(--color-warning)" : u.is_banned ? "var(--color-text-muted)" : "var(--color-accent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "12px", fontWeight: "var(--font-weight-bold)", color: "#fff", flexShrink: 0,
                    }}
                  >
                    {u.full_name.charAt(0)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.full_name}
                      {u.id === user.id && <span style={{ marginLeft: "var(--space-2)", fontSize: "10px", color: "var(--color-text-muted)" }}>(you)</span>}
                    </p>
                    <Badge variant={u.user_type === "admin" ? "warning" : "default"} style={{ fontSize: "9px" }}>
                      <Icon d={u.user_type === "admin" ? IC.shield : IC.overview} size={9} />
                      <span style={{ marginLeft: "2px" }}>{u.user_type}</span>
                    </Badge>
                  </div>
                </div>

                {/* Email */}
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.email}
                </span>

                {/* Plan */}
                <Badge variant={u.subscription_tier === "free" ? "muted" : "success"} style={{ textTransform: "capitalize", textAlign: "center" }}>
                  {u.subscription_tier}
                </Badge>

                {/* Status */}
                {u.is_banned ? (
                  <Badge variant="danger" style={{ textAlign: "center" }}>Banned</Badge>
                ) : (
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "center" }}>Active</span>
                )}

                {/* Notes */}
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", textAlign: "center" }}>{u.notes_count}</span>

                {/* Folders */}
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", textAlign: "center" }}>{u.folders_count}</span>

                {/* Joined */}
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{formatDate(u.created_at)}</span>

                {/* Delete (only for non-admin, non-self) */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {u.user_type !== "admin" && u.id !== user.id && (
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => setConfirmDeleteUserId(u.id)}
                    >
                      Delete
                    </Button>
                  )}
                  {u.id === user.id && (
                    <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="👥" title="No users found" description="Try adjusting your search or filters." action={
            <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</Button>
          } />
        )}
      </Card>

      {/* ========================================================= */}
      {/* SECTIONS 2-5: QUICK ACTION CARDS                        */}
      {/* ========================================================= */}

      <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)", margin: "0 0 var(--space-4)" }}>
        Quick Actions
      </h2>

      <div className="action-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
        {/* ── Ban/Unban ── */}
        <ActionPanel title="Ban / Unban" description="Restore or restrict content creation" icon={IC.shield} accent="warning">
          <UserSelect users={usersList} selectedId={banSelectedId} onSelect={setBanSelectedId} placeholder="Choose user to moderate…" />
          {banSelectedId && (() => {
            const target = getUser(banSelectedId);
            if (!target) return null;
            if (target.user_type === "admin") {
              return <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--font-size-sm)", color: "var(--color-danger)" }}>Admins cannot be banned.</p>;
            }
            return (
              <div style={{ marginTop: "var(--space-3)", display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                  <strong>{target.full_name}</strong> is currently{" "}
                  <Badge variant={target.is_banned ? "danger" : "muted"}>{target.is_banned ? "Banned" : "Active"}</Badge>
                </span>
                <Button
                  variant={target.is_banned ? "accent-ghost" : "danger"}
                  size="sm"
                  onClick={async () => {
                    try {
                      const supabase = requireSupabase();
                      await supabase.from("profiles").update({ is_banned: !target.is_banned }).eq("id", target.id);
                      setUsersList((prev) => prev.map((r) => r.id === target.id ? { ...r, is_banned: !target.is_banned } : r));
                      addToast(`${target.full_name} ${target.is_banned ? "unbanned" : "banned"}`, "success");
                      void logActivity(target.email, target.full_name, target.is_banned ? "user_unbanned" : "user_banned", `Admin ${user.full_name} ${target.is_banned ? "unbanned" : "banned"} user ${target.full_name}`);
                    } catch { addToast("Action failed. Try again.", "error"); }
                  }}
                >
                  {target.is_banned ? "Unban user" : "Ban user"}
                </Button>
              </div>
            );
          })()}
        </ActionPanel>

        {/* ── Change Tier ── */}
        <ActionPanel title="Change Tier" description="Upgrade or downgrade subscription plan" icon={IC.folder} accent="accent">
          <UserSelect users={usersList} selectedId={tierSelectedId} onSelect={setTierSelectedId} placeholder="Choose user to modify…" />
          {tierSelectedId && (() => {
            const target = getUser(tierSelectedId);
            if (!target) return null;
            return (
              <div style={{ marginTop: "var(--space-3)" }}>
                <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                  Current tier: <Badge variant={target.subscription_tier === "free" ? "muted" : "success"} style={{ textTransform: "capitalize" }}>{target.subscription_tier}</Badge>
                </p>
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  {TIERS.map((tier) => (
                    <Button
                      key={tier}
                      variant={target.subscription_tier === tier ? "primary" : "secondary"}
                      size="sm"
                      style={{ textTransform: "capitalize" }}
                      disabled={target.subscription_tier === tier}
                      onClick={async () => {
                        try {
                          const supabase = requireSupabase();
                          await supabase.from("profiles").update({ subscription_tier: tier }).eq("id", target.id);
                          setUsersList((prev) => prev.map((r) => r.id === target.id ? { ...r, subscription_tier: tier } : r));
                          addToast(`${target.full_name} set to ${tier}`, "success");
                          void logActivity(target.email, target.full_name, "tier_changed", `Admin ${user.full_name} changed ${target.full_name}'s tier to ${tier}`);
                        } catch { addToast("Failed to update tier. Try again.", "error"); }
                      }}
                    >
                      {tier}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })()}
        </ActionPanel>

        {/* ── Promote / Demote ── */}
        <ActionPanel title="Role Management" description="Promote users to admin or demote to regular user" icon={IC.users} accent="accent">
          <UserSelect users={usersList} selectedId={roleSelectedId} onSelect={setRoleSelectedId} placeholder="Choose user to promote/demote…" />
          {roleSelectedId && (() => {
            const target = getUser(roleSelectedId);
            if (!target) return null;
            if (target.id === user.id) {
              return <p style={{ margin: "var(--space-3) 0 0", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>You cannot change your own role.</p>;
            }
            return (
              <div style={{ marginTop: "var(--space-3)" }}>
                <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                  <strong>{target.full_name}</strong> is currently{" "}
                  <Badge variant={target.user_type === "admin" ? "warning" : "default"}>
                    {target.user_type === "admin" ? "Admin" : "User"}
                  </Badge>
                </p>
                {target.user_type === "admin" ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      try {
                        const supabase = requireSupabase();
                        await supabase.from("profiles").update({ user_type: "user" }).eq("id", target.id);
                        setUsersList((prev) => prev.map((r) => r.id === target.id ? { ...r, user_type: "user" } : r));
                        addToast(`${target.full_name} demoted to user`, "success");
                        void logActivity(target.email, target.full_name, "user_demoted", `Admin ${user.full_name} demoted ${target.full_name} to user`);
                      } catch { addToast("Failed to update role. Try again.", "error"); }
                    }}
                  >
                    Demote to User
                  </Button>
                ) : (
                  <Button
                    variant="accent-ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        const supabase = requireSupabase();
                        await supabase.from("profiles").update({ user_type: "admin" }).eq("id", target.id);
                        setUsersList((prev) => prev.map((r) => r.id === target.id ? { ...r, user_type: "admin" } : r));
                        addToast(`${target.full_name} promoted to admin`, "success");
                        void logActivity(target.email, target.full_name, "user_promoted", `Admin ${user.full_name} promoted ${target.full_name} to admin`);
                      } catch { addToast("Failed to update role. Try again.", "error"); }
                    }}
                  >
                    Promote to Admin
                  </Button>
                )}
              </div>
            );
          })()}
        </ActionPanel>

        {/* ── Reset Password ── */}
        <ActionPanel title="Reset Password" description="Set a new password for any user account" icon={IC.settings} accent="danger">            <UserSelect users={usersList.filter((u) => u.id !== user.id)} selectedId={passwordSelectedId} onSelect={(id) => { setPasswordSelectedId(id); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); }} placeholder="Choose user for password reset…" />
          {passwordSelectedId && (() => {
            const target = getUser(passwordSelectedId);
            if (!target) return null;
            return (
              <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                  New password for <strong>{target.full_name}</strong>
                </p>
                <input
                  type="password"
                  placeholder="New password (min. 6 chars)"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                  style={{
                    width: "100%", fontFamily: "var(--font-sans)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)",
                    background: "var(--color-bg-elevated)", border: `1px solid ${newPassword && newPassword.length < 6 ? "var(--color-danger)" : "var(--color-border)"}`,
                    borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)", outline: "none", boxSizing: "border-box",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.boxShadow = "none"; }}
                />
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                  style={{
                    width: "100%", fontFamily: "var(--font-sans)", fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)",
                    background: "var(--color-bg-elevated)", border: `1px solid ${confirmPassword && newPassword !== confirmPassword ? "var(--color-danger)" : "var(--color-border)"}`,
                    borderRadius: "var(--radius-md)", padding: "var(--space-2) var(--space-3)", outline: "none", boxSizing: "border-box",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.boxShadow = "none"; }}
                />
                {newPassword.length > 0 && newPassword.length < 6 && (
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--color-danger)" }}>Minimum 6 characters required</p>
                )}
                {confirmPassword && newPassword !== confirmPassword && (
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--color-danger)" }}>Passwords do not match</p>
                )}
                {passwordError && (
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--color-danger)" }}>{passwordError}</p>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  fullWidth
                  disabled={newPassword.length < 6 || newPassword !== confirmPassword || changingPassword}
                  onClick={async () => {
                    if (!passwordSelectedId || newPassword.length < 6 || newPassword !== confirmPassword) return;
                    setChangingPassword(true);
                    try {
                      const supabase = requireSupabase();
                      const { error } = await supabase.rpc("admin_change_password", {
                        target_user_id: passwordSelectedId,
                        new_password: newPassword,
                      });
                      if (error) throw error;
                      addToast("Password changed successfully", "success");
                      setPasswordSelectedId(null);
                      setNewPassword("");
                      setConfirmPassword("");
                    } catch (err) {
                      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
                    } finally {
                      setChangingPassword(false);
                    }
                  }}
                >
                  {changingPassword ? "Saving…" : "Save new password"}
                </Button>
              </div>
            );
          })()}

        </ActionPanel>
      </div>

      {/* ── Delete user confirmation modal ── */}
      <Modal isOpen={!!confirmDeleteUserId} onClose={() => setConfirmDeleteUserId(null)} width={400}>
        <h3 style={{ marginBottom: "var(--space-2)", fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", color: "var(--color-danger)" }}>
          Delete user?
        </h3>
        <p style={{ marginBottom: "var(--space-2)", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          You are about to permanently delete{" "}
          <strong>{getUser(confirmDeleteUserId)?.full_name}</strong>{" "}
          ({getUser(confirmDeleteUserId)?.email}).
        </p>
        <p style={{ marginBottom: "var(--space-6)", fontSize: "var(--font-size-sm)", color: "var(--color-danger)" }}>
          This will permanently remove the user and all associated data: folders, subfolders, notes, collaborators, and activity history.
          <strong> This action cannot be undone.</strong>
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteUserId(null)}>Cancel</Button>
          <Button
            variant="danger"
            size="sm"
            disabled={deletingUser}
            onClick={async () => {
              if (!confirmDeleteUserId) return;
              setDeletingUser(true);
              const target = getUser(confirmDeleteUserId);
              try {
                const supabase = requireSupabase();
                const { error } = await supabase.rpc("admin_delete_user", { target_user_id: confirmDeleteUserId });
                if (error) throw error;
                setUsersList((prev) => prev.filter((r) => r.id !== confirmDeleteUserId));
                addToast(`${target?.full_name || "User"} has been deleted`, "success");
                void logActivity(target?.email || "", target?.full_name || "Unknown", "user_deleted", `Admin ${user.full_name} deleted user ${target?.full_name || "Unknown"}`);
                setConfirmDeleteUserId(null);
              } catch (err) {
                addToast(`Failed to delete: ${err instanceof Error ? err.message : "Try again"}`, "error");
              } finally {
                setDeletingUser(false);
              }
            }}
          >
            {deletingUser ? "Deleting…" : "Delete user"}
          </Button>
        </div>
      </Modal>

      <style>{`@media (max-width: 768px) { .action-grid { grid-template-columns: 1fr !important; } }`}</style>
    </DashboardLayout>
  );
}
