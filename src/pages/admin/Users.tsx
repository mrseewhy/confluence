import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button, EmptyState } from "@/components/ui";
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

export function AdminUsers() {
  const { profile } = useAuth();
  const user = profile;

  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<UserRow[]>([]);
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "user">("all");
  const [confirmBanUserId, setConfirmBanUserId] = useState<string | null>(null);
  const [tierDropdownUserId, setTierDropdownUserId] = useState<string | null>(null);
  const [passwordModalUserId, setPasswordModalUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const supabase = requireSupabase();

        // Use the admin_get_users RPC to get profiles with emails
        const { data: usersWithEmail, error: rpcError } = await supabase
          .rpc("admin_get_users");

        if (rpcError) throw rpcError;

        // Get notes and folders counts
        const { data: notesData } = await supabase
          .from("notes")
          .select("owner_id");

        const { data: foldersData } = await supabase
          .from("folders")
          .select("owner_id");

        const noteCounts: Record<string, number> = {};
        const folderCounts: Record<string, number> = {};

        (notesData || []).forEach((n) => {
          noteCounts[n.owner_id] = (noteCounts[n.owner_id] || 0) + 1;
        });
        (foldersData || []).forEach((f) => {
          folderCounts[f.owner_id] = (folderCounts[f.owner_id] || 0) + 1;
        });

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
    };
    void loadUsers();
  }, [addToast]);

  const filtered = usersList.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)) &&
      (filter === "all" || u.user_type === filter)
    );
  });

  if (!user || loading) {
    return (
      <DashboardLayout
        user={
          user || fallbackProfile({ user_type: "admin" })
        }
        variant="admin"
      >
        <div
          style={{
            padding: "var(--space-20)",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          Loading users…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} variant="admin">
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
            Users
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {usersList.length} registered user
            {usersList.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div
        style={{
          background: "var(--color-warning-subtle)",
          border: "1px solid var(--color-warning)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-3) var(--space-5)",
          marginBottom: "var(--space-6)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-warning)",
          flexWrap: "wrap",
        }}
      >
        <Icon d={IC.shield} size={16} />
        <span>
          Manage users: <strong>Ban</strong> to block content creation, <strong>Password</strong> to reset credentials, <strong>Delete</strong> to remove user permanently. Admins cannot be banned or deleted.
        </span>
      </div>

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
          placeholder="Search by name or email…"
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
          {(["all", "admin", "user"] as const).map((v) => (
            <Button
              key={v}
              variant={filter === v ? "accent-ghost" : "secondary"}
              size="sm"
              onClick={() => setFilter(v)}
              style={{ textTransform: "capitalize" }}
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Ban confirmation modal ── */}
      <Modal isOpen={!!confirmBanUserId} onClose={() => setConfirmBanUserId(null)} width={360}>
        <h3 style={{ marginBottom: "var(--space-2)", fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)" }}>
          Ban user?
        </h3>
        <p style={{ marginBottom: "var(--space-6)", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          This user will no longer be able to create folders, subfolders, or notes.
          Existing content will remain but the user is blocked from new actions.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <Button variant="secondary" size="sm" onClick={() => setConfirmBanUserId(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={async () => {
            if (!confirmBanUserId) return;
            const target = usersList.find((u) => u.id === confirmBanUserId);
            try {
              const supabase = requireSupabase();
              await supabase.from("profiles").update({ is_banned: true }).eq("id", confirmBanUserId);
              setUsersList((prev) => prev.map((row) => row.id === confirmBanUserId ? { ...row, is_banned: true } : row));
              addToast(`${target?.full_name || "User"} has been banned`, "success");
              // Log the ban (fire-and-forget)
              void (async () => {
                try { await supabase.from("activity_log").insert({
                  inviter_id: user.id,
                  invitee_email: target?.email || "",
                  action: "user_banned",
                  item_type: "user",
                  item_title: target?.full_name || "Unknown",
                  details: `Admin ${user.full_name} banned user ${target?.full_name || "Unknown"}`,
                }); } catch {}
              })();
            } catch {
              addToast(`Failed to ban user. Try again.`, "error");
            }
            setConfirmBanUserId(null);
          }}>
            Ban user
          </Button>
        </div>
      </Modal>

      {/* ── Password change modal ── */}
      <Modal isOpen={!!passwordModalUserId} onClose={() => { setPasswordModalUserId(null); setNewPassword(""); setConfirmPassword(""); }} width={380}>
        <h3 style={{ marginBottom: "var(--space-2)", fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)" }}>
          Change password
        </h3>
        <p style={{ marginBottom: "var(--space-4)", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          Set a new password for{" "}
          <strong>{usersList.find((u) => u.id === passwordModalUserId)?.full_name}</strong>.
          The user will need to use this new password on next login.
        </p>
        <input
          type="password"
          placeholder="New password (min. 6 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoFocus
          style={{
            width: "100%",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-primary)",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-2) var(--space-3)",
            outline: "none",
            marginBottom: "var(--space-3)",
            boxSizing: "border-box",
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
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{
            width: "100%",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-primary)",
            background: "var(--color-bg-elevated)",
            border: `1px solid ${confirmPassword && newPassword !== confirmPassword ? "var(--color-danger)" : "var(--color-border)"}`,
            borderRadius: "var(--radius-md)",
            padding: "var(--space-2) var(--space-3)",
            outline: "none",
            marginBottom: "var(--space-3)",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = confirmPassword && newPassword !== confirmPassword ? "var(--color-danger)" : "var(--color-border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        {newPassword.length > 0 && newPassword.length < 6 && (
          <p style={{ margin: "0 0 var(--space-3)", fontSize: "11px", color: "var(--color-danger)" }}>
            Minimum 6 characters required
          </p>
        )}
        {confirmPassword && newPassword !== confirmPassword && (
          <p style={{ margin: "0 0 var(--space-3)", fontSize: "11px", color: "var(--color-danger)" }}>
            Passwords do not match
          </p>
        )}
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <Button variant="secondary" size="sm" onClick={() => { setPasswordModalUserId(null); setNewPassword(""); setConfirmPassword(""); }}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={newPassword.length < 6 || newPassword !== confirmPassword || changingPassword}
            onClick={async () => {
              if (!passwordModalUserId || newPassword.length < 6 || newPassword !== confirmPassword) return;
              setChangingPassword(true);
              try {
                const supabase = requireSupabase();
                const { error } = await supabase.rpc("admin_change_password", {
                  target_user_id: passwordModalUserId,
                  new_password: newPassword,
                });
                if (error) throw error;
                addToast("Password changed successfully", "success");
                setPasswordModalUserId(null);
                setNewPassword("");
                setConfirmPassword("");
              } catch (err) {
                addToast(`Failed to change password: ${err instanceof Error ? err.message : "Try again"}`, "error");
              } finally {
                setChangingPassword(false);
              }
            }}
          >
            {changingPassword ? "Saving..." : "Save password"}
          </Button>
        </div>
      </Modal>

      {/* ── Delete user confirmation modal ── */}
      <Modal isOpen={!!confirmDeleteUserId} onClose={() => setConfirmDeleteUserId(null)} width={400}>
        <h3 style={{ marginBottom: "var(--space-2)", fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", color: "var(--color-danger)" }}>
          Delete user?
        </h3>
        <p style={{ marginBottom: "var(--space-2)", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          You are about to permanently delete{" "}
          <strong>{usersList.find((u) => u.id === confirmDeleteUserId)?.full_name}</strong>
          {" "}({usersList.find((u) => u.id === confirmDeleteUserId)?.email}).
        </p>
        <p style={{ marginBottom: "var(--space-6)", fontSize: "var(--font-size-sm)", color: "var(--color-danger)" }}>
          This will permanently remove the user and all associated data:
          folders, subfolders, notes, collaborators, and activity history.
          <strong> This action cannot be undone.</strong>
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteUserId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={deletingUser}
            onClick={async () => {
              if (!confirmDeleteUserId) return;
              setDeletingUser(true);
              const target = usersList.find((u) => u.id === confirmDeleteUserId);
              try {
                const supabase = requireSupabase();
                const { error } = await supabase.rpc("admin_delete_user", {
                  target_user_id: confirmDeleteUserId,
                });
                if (error) throw error;
                setUsersList((prev) => prev.filter((row) => row.id !== confirmDeleteUserId));
                addToast(`${target?.full_name || "User"} has been deleted`, "success");
                void (async () => {
                  try { await supabase.from("activity_log").insert({
                    inviter_id: user.id,
                    invitee_email: target?.email || "",
                    action: "user_deleted",
                    item_type: "user",
                    item_title: target?.full_name || "Unknown",
                    details: `Admin ${user.full_name} deleted user ${target?.full_name || "Unknown"}`,
                  }); } catch {}
                })();
                setConfirmDeleteUserId(null);
              } catch (err) {
                addToast(`Failed to delete: ${err instanceof Error ? err.message : "Try again"}`, "error");
              } finally {
                setDeletingUser(false);
              }
            }}
          >
            {deletingUser ? "Deleting..." : "Delete user"}
          </Button>
        </div>
      </Modal>

      {filtered.length > 0 ? (
        <div
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          {/* ── Table header ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 80px 70px 50px 50px 110px 200px",
              gap: "var(--space-3)",
              padding: "var(--space-3) var(--space-5)",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-bg-subtle)",
            }}
          >
            {["User", "Email", "Plan", "Status", "Notes", "Fldrs", "Joined", "Actions"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: "11px",
                  fontWeight: "var(--font-weight-semibold)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* ── Table rows ── */}
          {filtered.map((u, i) => (
            <div
              key={u.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 80px 70px 50px 50px 110px 200px",
                gap: "var(--space-3)",
                alignItems: "center",
                padding: "var(--space-3) var(--space-5)",
                borderBottom:
                  i < filtered.length - 1
                    ? "1px solid var(--color-border-subtle)"
                    : "none",
                transition: "background var(--duration-fast)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = u.is_banned ? "var(--color-danger-subtle)" : "var(--color-bg-subtle)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {/* User name + avatar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "var(--radius-full)",
                    background:
                      u.user_type === "admin"
                        ? "var(--color-warning)"
                        : "var(--color-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "var(--font-weight-bold)",
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {u.full_name.charAt(0)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--font-size-sm)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--color-text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.full_name}
                    {u.id === user.id && (
                      <span
                        style={{
                          marginLeft: "var(--space-2)",
                          fontSize: "10px",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        (you)
                      </span>
                    )}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "10px",
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    <Badge variant={u.user_type === "admin" ? "warning" : "default"} style={{ fontSize: "9px" }}>
                      {u.user_type}
                    </Badge>
                  </p>
                </div>
              </div>

              {/* Email */}
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.email}
              </span>

              {/* Plan */}
              <Badge variant={u.subscription_tier === "free" ? "muted" : "success"} style={{ textTransform: "capitalize", textAlign: "center" }}>
                {u.subscription_tier}
              </Badge>

              {/* Status (Banned / Active) */}
              {u.is_banned ? (
                <Badge variant="danger" style={{ textAlign: "center" }}>Banned</Badge>
              ) : (
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "center" }}>
                  Active
                </span>
              )}

              {/* Notes count */}
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                  textAlign: "center",
                }}
              >
                {u.notes_count}
              </span>

              {/* Folders count */}
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                  textAlign: "center",
                }}
              >
                {u.folders_count}
              </span>

              {/* Joined date */}
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                }}
              >
                {formatDate(u.created_at)}
              </span>

              {/* Actions */}
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                {/* Ban/Unban toggle — not for admins or self */}
                {u.user_type !== "admin" && u.id !== user.id && (
                  u.is_banned ? (
                    <Button
                      variant="accent-ghost"
                      size="xs"
                      onClick={async () => {
                        try {
                          const supabase = requireSupabase();
                          await supabase.from("profiles").update({ is_banned: false }).eq("id", u.id);
                          setUsersList((prev) => prev.map((row) => row.id === u.id ? { ...row, is_banned: false } : row));
                          addToast(`${u.full_name} has been unbanned`, "success");
                          void (async () => {
                            try { await supabase.from("activity_log").insert({
                              inviter_id: user.id,
                              invitee_email: u.email,
                              action: "user_unbanned",
                              item_type: "user",
                              item_title: u.full_name,
                              details: `Admin ${user.full_name} unbanned user ${u.full_name}`,
                            }); } catch {}
                          })();
                        } catch {
                          addToast(`Failed to unban ${u.full_name}. Try again.`, "error");
                        }
                      }}
                    >
                      Unban
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => setConfirmBanUserId(u.id)}
                    >
                      Ban
                    </Button>
                  )
                )}

                {/* Promote — only for non-admin users */}
                {u.user_type !== "admin" && u.id !== user.id && (
                  <Button
                    variant="accent-ghost"
                    size="xs"
                    onClick={async () => {
                      try {
                        const supabase = requireSupabase();
                        await supabase.from("profiles").update({ user_type: "admin" }).eq("id", u.id);
                        setUsersList((prev) => prev.map((row) => row.id === u.id ? { ...row, user_type: "admin" } : row));
                        addToast(`${u.full_name} promoted to admin`, "success");
                        void (async () => {
                          try { await supabase.from("activity_log").insert({
                            inviter_id: user.id,
                            invitee_email: u.email,
                            action: "user_promoted",
                            item_type: "user",
                            item_title: u.full_name,
                            details: `Admin ${user.full_name} promoted ${u.full_name} to admin`,
                          }); } catch {}
                        })();
                      } catch {
                        addToast(`Failed to promote ${u.full_name}. Try again.`, "error");
                      }
                    }}
                  >
                    Promote
                  </Button>
                )}

                {/* Password reset — for all non-self users */}
                {u.id !== user.id && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => { setPasswordModalUserId(u.id); setNewPassword(""); }}
                    title="Reset password"
                  >
                    Password
                  </Button>
                )}

                {/* Tier dropdown */}
                {u.id !== user.id && (
                  <div style={{ position: "relative" }}>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setTierDropdownUserId(tierDropdownUserId === u.id ? null : u.id)}
                    >
                      Tier ▾
                    </Button>
                    {tierDropdownUserId === u.id && (
                      <>
                        <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setTierDropdownUserId(null)} />
                        <div style={{
                          position: "absolute", top: "100%", right: 0, zIndex: 100,
                          background: "var(--color-bg-elevated)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          boxShadow: "var(--shadow-md)",
                          overflow: "hidden",
                          minWidth: "120px",
                        }}>
                          {TIERS.map((tier) => (
                            <button
                              key={tier}
                              onClick={async () => {
                                try {
                                  const supabase = requireSupabase();
                                  await supabase.from("profiles").update({ subscription_tier: tier }).eq("id", u.id);
                                  setUsersList((prev) => prev.map((row) => row.id === u.id ? { ...row, subscription_tier: tier } : row));
                                  addToast(`${u.full_name} set to ${tier}`, "success");
                                  void (async () => {
                                    try { await supabase.from("activity_log").insert({
                                      inviter_id: user.id,
                                      invitee_email: u.email,
                                      action: "tier_changed",
                                      item_type: "user",
                                      item_title: u.full_name,
                                      details: `Admin ${user.full_name} changed ${u.full_name}'s tier to ${tier}`,
                                    }); } catch {}
                                  })();
                                } catch {
                                  addToast(`Failed to update tier. Try again.`, "error");
                                }
                                setTierDropdownUserId(null);
                              }}
                              style={{
                                display: "block",
                                width: "100%",
                                padding: "var(--space-2) var(--space-3)",
                                border: "none",
                                background: u.subscription_tier === tier ? "var(--color-accent-subtle)" : "transparent",
                                color: u.subscription_tier === tier ? "var(--color-accent)" : "var(--color-text-primary)",
                                fontSize: "var(--font-size-sm)",
                                textAlign: "left",
                                cursor: "pointer",
                                fontFamily: "var(--font-sans)",
                                textTransform: "capitalize",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-muted)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = u.subscription_tier === tier ? "var(--color-accent-subtle)" : "transparent"; }}
                            >
                              {tier}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Delete — only for non-admin, non-self */}
                {u.user_type !== "admin" && u.id !== user.id && (
                  <Button
                    variant="danger"
                    size="xs"
                    onClick={() => setConfirmDeleteUserId(u.id)}
                    style={{ fontWeight: "var(--font-weight-semibold)" }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="👥"
          title="No users found"
          description="Try adjusting your search or filters."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
    </DashboardLayout>
  );
}
