import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button, EmptyState, Card } from "@/components/ui";
import { ActionPanel, ItemSelect, type SelectItem } from "@/components/admin";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { formatDate } from "@/lib/helpers";
import { safeStr, safeBool, safeNum } from "@/lib/safeParse";
import styles from "@/styles/admin.module.css";

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

function userToSelect(u: UserRow): SelectItem {
  return {
    id: u.id,
    primary: u.full_name,
    secondary: u.email,
    badge: u.user_type === "admin" ? { label: "admin", variant: "warning" } : undefined,
  };
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
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "user">("all");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

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

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const loadUsers = useCallback(async (currentPage: number, currentSearch: string, currentFilter: "all" | "admin" | "user") => {
    try {
      const supabase = requireSupabase();
      const offset = (currentPage - 1) * PAGE_SIZE;
      const searchParam = currentSearch || null;
      const typeParam = currentFilter === "all" ? null : currentFilter;
      const { data: usersWithEmail, error: rpcError } = await supabase.rpc("admin_get_users", { p_limit: PAGE_SIZE, p_offset: offset, p_search: searchParam, p_user_type: typeParam });
      if (rpcError) throw rpcError;

      const { data: countData, error: countError } = await supabase.rpc("admin_count_users", { p_search: searchParam, p_user_type: typeParam });
      if (countError) throw countError;

      // Fetch notes/folders counts for the returned users
      const ids = (usersWithEmail || []).map((p: Record<string, unknown>) => safeStr(p.user_id) || safeStr(p.id));
      let noteCounts: Record<string, number> = {};
      let folderCounts: Record<string, number> = {};
      if (ids.length > 0) {
        const [{ data: notesData }, { data: foldersData }] = await Promise.all([
          supabase.from("notes").select("owner_id").in("owner_id", ids),
          supabase.from("folders").select("owner_id").in("owner_id", ids),
        ]);
        (notesData || []).forEach((n: Record<string, unknown>) => { noteCounts[safeStr(n.owner_id)] = (noteCounts[safeStr(n.owner_id)] || 0) + 1; });
        (foldersData || []).forEach((f: Record<string, unknown>) => { folderCounts[safeStr(f.owner_id)] = (folderCounts[safeStr(f.owner_id)] || 0) + 1; });
      }

      const rows: UserRow[] = (usersWithEmail || []).map((p: Record<string, unknown>) => {
        const uid = safeStr(p.user_id) || safeStr(p.id);
        return {
          id: uid,
          email: safeStr(p.user_email) || safeStr(p.email),
          full_name: safeStr(p.user_full_name) || safeStr(p.full_name),
          avatar_url: safeStr(p.user_avatar_url) || safeStr(p.avatar_url) || null,
          user_type: (safeStr(p.user_type) as "user" | "admin") || "user",
          subscription_tier: safeStr(p.subscription_tier, "free"),
          is_banned: safeBool(p.is_banned),
          created_at: safeStr(p.created_at),
          notes_count: safeNum(noteCounts[uid]),
          folders_count: safeNum(folderCounts[uid]),
        };
      });

      setUsersList(rows);
      setTotalCount(safeNum(countData));
    } catch (err) {
      console.error("Error loading users:", err);
      addToast("Failed to load users. Try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void loadUsers(page, debouncedSearch, filter); }, [page, debouncedSearch, filter, loadUsers]);

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

  // Client-side filter on the current page data (for search/filter display only)
  const filtered = usersList.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (filter === "all" || u.user_type === filter)
    );
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginated = filtered;

  useEffect(() => { setPage(1); }, [debouncedSearch, filter]);

  // ── Loading state ──

  if (!user || loading) {
    return (
      <DashboardLayout user={user || fallbackProfile({ user_type: "admin" })} variant="admin">
        <div className={styles.loadingState}>
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
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.headerTitleRow}>
            <div className={styles.headerIcon} style={{
              background: "var(--color-warning-subtle)", border: "1px solid var(--color-warning)",
              color: "var(--color-warning)",
            }}>
              <Icon d={IC.shield} size={14} />
            </div>
            <h1 className={styles.headerTitle}>
              User Management
            </h1>
          </div>
          <p className={styles.headerSubtitle}>
            {totalCount} registered user{totalCount !== 1 ? "s" : ""} · Full control over accounts, roles, and access
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: ALL USERS — clean table with delete only      */}
      {/* ========================================================= */}

      <Card className={styles.cardTable}>
        <div className={styles.cardHeader}>
          <div className={styles.cardFlexRow}>
            <div className={styles.cardFlexLeft}>
              <h2 className={styles.cardTitle}>
                All Users
              </h2>
              <span className={styles.cardSubtitle}>
                {paginated.length} on this page · Page {page} of {totalPages} ({totalCount} total)
              </span>
            </div>
            <div className={styles.filterBtnGroup}>
              {(["all", "admin", "user"] as const).map((v) => (
                <Button key={v} variant={filter === v ? "accent-ghost" : "secondary"} size="xs" onClick={() => setFilter(v)} style={{ textTransform: "capitalize" }} aria-pressed={filter === v}>
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
            className={styles.searchInput}
            aria-label="Search users"
          />
        </div>

        {filtered.length > 0 ? (
          <div>
            {/* Table header */}
            <div className={styles.tableHeader} style={{ gridTemplateColumns: "1.5fr 1fr 80px 70px 60px 60px 110px 60px" }}>
              {["User", "Email", "Plan", "Status", "Notes", "Folders", "Joined", ""].map((h) => (
                <span className={styles.tableHeaderCell}>
                  {h}
                </span>
              ))}
            </div>

            {/* Table rows */}
            {paginated.map((u, i) => (
              <div
                key={u.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 80px 70px 60px 60px 110px 60px",
                  gap: "var(--space-3)",
                  alignItems: "center",
                  padding: "var(--space-3) var(--space-5)",
                  borderBottom: i < paginated.length - 1 ? "1px solid var(--color-border-subtle)" : "none",
                  background: u.is_banned ? "var(--color-danger-subtle)" : "transparent",
                  transition: "background var(--duration-fast)",
                }}
              >
                <div className={styles.cellFlex}>
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
                    <p className={styles.cellText}>
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
                <div className={styles.cellActions}>
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

        {/* Pagination */}
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
      {/* SECTIONS 2-5: QUICK ACTION CARDS                        */}
      {/* ========================================================= */}

      <h2 className={styles.sectionTitle}>
        Quick Actions
      </h2>

      <div className={styles.actionGrid}>
        {/* ── Ban/Unban ── */}
        <ActionPanel title="Ban / Unban" description="Restore or restrict content creation" icon={IC.shield} accent="warning">
          <ItemSelect items={usersList.map(userToSelect)} selectedId={banSelectedId} onSelect={setBanSelectedId} placeholder="Choose user to moderate…" />
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
          <ItemSelect items={usersList.map(userToSelect)} selectedId={tierSelectedId} onSelect={setTierSelectedId} placeholder="Choose user to modify…" />
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
          <ItemSelect items={usersList.map(userToSelect)} selectedId={roleSelectedId} onSelect={setRoleSelectedId} placeholder="Choose user to promote/demote…" />
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
        <ActionPanel title="Reset Password" description="Set a new password for any user account" icon={IC.settings} accent="danger">            <ItemSelect items={usersList.filter((u) => u.id !== user.id).map(userToSelect)} selectedId={passwordSelectedId} onSelect={(id) => { setPasswordSelectedId(id); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); }} placeholder="Choose user for password reset…" />
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


    </DashboardLayout>
  );
}
