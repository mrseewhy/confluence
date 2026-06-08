import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button, Input } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { Modal } from "@/components/Modal";
import { uploadImage } from "@/lib/upload";

export function DashboardSettings() {
  const { profile } = useAuth();
  const user = profile;

  const [name, setName] = useState(user?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Avatar state
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Notification preference state
  const [sendInviteEmails, setSendInviteEmails] = useState(true);
  const [notifSaved, setNotifSaved] = useState(false);

  const { refreshProfile, signOut } = useAuth();

  // Load notification preference
  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const supabase = requireSupabase();
        const { data } = await supabase
          .from("notification_preferences")
          .select("send_invite_emails")
          .eq("user_id", user.id)
          .single();
        if (data) setSendInviteEmails(data.send_invite_emails);
      } catch {
        // Silently fall back to default
      }
    })();
  }, [user?.id]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to update password."
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be under 2 MB.");
      return;
    }

    setAvatarUploading(true);
    setAvatarError("");

    try {
      const result = await uploadImage(file, user.id);
      if (!result.ok) {
        setAvatarError(result.error);
        return;
      }

      const supabase = requireSupabase();
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: result.url })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : "Failed to upload avatar."
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    setDeleteError("");

    try {
      const supabase = requireSupabase();

      // Get the user's current session token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error("No session available. Please sign in again.");
      }

      // Determine the edge function URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/delete-account`;

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to delete account.");
      }

      // Sign out after successful deletion
      await signOut();
      window.location.href = "/";
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete account."
      );
      setDeletingAccount(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user || name.trim() === user.full_name) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Error updating profile:", err);
      setSaveError(
        err instanceof Error ? err.message : "Failed to save changes."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout
        user={fallbackProfile()}
        variant="user"
      >
        <div
          style={{
            padding: "var(--space-20)",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          Loading settings…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} variant="user">
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-bold)",
            letterSpacing: "var(--letter-spacing-tight)",
            marginBottom: "var(--space-1)",
          }}
        >
          Settings
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          Manage your account and preferences.
        </p>
      </div>

      <div
        style={{
          maxWidth: "600px",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-8)",
        }}
      >
        {/* Profile */}
        <section
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "var(--space-5) var(--space-6)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <h3
              style={{
                fontSize: "var(--font-size-md)",
                fontWeight: "var(--font-weight-semibold)",
                margin: 0,
                color: "var(--color-text-primary)",
              }}
            >
              Profile
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
                marginTop: "2px",
              }}
            >
              Update your public profile details.
            </p>
          </div>
          <form
            onSubmit={handleSave}
            style={{
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-5)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-5)",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "var(--radius-full)",
                  background: "var(--color-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--font-size-xl)",
                  fontWeight: "var(--font-weight-bold)",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleAvatarUpload(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={avatarUploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {avatarUploading ? "Uploading…" : "Change avatar"}
                </Button>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                    marginTop: "var(--space-1)",
                  }}
                >
                  JPG, PNG or GIF. Max 2MB.
                </p>
                {avatarError && (
                  <p
                    style={{
                      margin: "var(--space-1) 0 0",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-danger)",
                    }}
                  >
                    {avatarError}
                  </p>
                )}
              </div>
            </div>

            <Input
              label="Full name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            {saveError && (
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-danger)",
                  background: "var(--color-danger-subtle)",
                  border: "1px solid var(--color-danger)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-3) var(--space-4)",
                }}
              >
                {saveError}
              </div>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {saved && (
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-success)",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  {"\u2713"} Saved
                </span>
              )}
            </div>
          </form>
        </section>

        {/* Password */}
        <section
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "var(--space-5) var(--space-6)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <h3
              style={{
                fontSize: "var(--font-size-md)",
                fontWeight: "var(--font-weight-semibold)",
                margin: 0,
                color: "var(--color-text-primary)",
              }}
            >
              Password
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
                marginTop: "2px",
              }}
            >
              Update your password regularly for security.
            </p>
          </div>
          <form
            onSubmit={handlePasswordSubmit}
            style={{
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            {passwordError && (
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-danger)",
                  background: "var(--color-danger-subtle)",
                  border: "1px solid var(--color-danger)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-3) var(--space-4)",
                }}
              >
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-success)",
                  background: "var(--color-success-subtle)",
                  border: "1px solid var(--color-success)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-3) var(--space-4)",
                }}
              >
                Password updated successfully!
              </div>
            )}
            {/* Hidden username field for password manager compatibility */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              defaultValue={user?.username || user?.full_name || user?.id || ""}
              style={{ display: "none" }}
              tabIndex={-1}
            />
            <Input
              label="New password"
              type="password"
              placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
              value={newPassword}
              onChange={(e) => {
                setPasswordError("");
                setNewPassword(e.target.value);
              }}
              autoComplete="new-password"
              required
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
              value={confirmPassword}
              onChange={(e) => {
                setPasswordError("");
                setConfirmPassword(e.target.value);
              }}
              autoComplete="new-password"
              required
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={
                  passwordLoading ||
                  !newPassword ||
                  !confirmPassword
                }
              >
                {passwordLoading ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
        </section>

        {/* Subscription Plan */}
        <section
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "var(--space-5) var(--space-6)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <h3
              style={{
                fontSize: "var(--font-size-md)",
                fontWeight: "var(--font-weight-semibold)",
                margin: 0,
                color: "var(--color-text-primary)",
              }}
            >
              Plan & Subscription
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
                marginTop: "2px",
              }}
            >
              Your current plan and billing information.
            </p>
          </div>
          <div
            style={{
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  Current plan
                </p>
              </div>
              <div
                style={{
                  padding: "4px 14px",
                  borderRadius: "var(--radius-full)",
                  background: "var(--color-accent-subtle)",
                  border: "1px solid var(--color-accent-muted)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-accent)",
                  textTransform: "capitalize",
                }}
              >
                {user?.subscription_tier || "free"}
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
              }}
            >
              {user?.subscription_tier === "free"
                ? "You're on the Free plan. No limits applied yet — upgrade options coming soon."
                : `You're on the ${user?.subscription_tier} plan.`}
            </p>
            {user?.subscription_tier === "free" && (
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-2)",
                  flexWrap: "wrap",
                  marginTop: "var(--space-2)",
                }}
              >
                {["bronze", "silver", "gold"].map((tier) => (
                  <div
                    key={tier}
                    style={{
                      flex: "1 0 80px",
                      padding: "var(--space-2) var(--space-3)",
                      background: "var(--color-bg-subtle)",
                      borderRadius: "var(--radius-md)",
                      textAlign: "center",
                      fontSize: "11px",
                      fontWeight: "var(--font-weight-semibold)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "var(--color-text-muted)",
                      opacity: 0.5,
                    }}
                  >
                    {tier}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Notification Preferences */}
        <section
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "var(--space-5) var(--space-6)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <h3
              style={{
                fontSize: "var(--font-size-md)",
                fontWeight: "var(--font-weight-semibold)",
                margin: 0,
                color: "var(--color-text-primary)",
              }}
            >
              Notifications
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
                marginTop: "2px",
              }}
            >
              Manage your email notification preferences.
            </p>
          </div>
          <div
            style={{
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  Invite notification emails
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Receive email when someone is invited as a collaborator
                </p>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "44px",
                  height: "24px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={sendInviteEmails}
                  onChange={async (e) => {
                    const newVal = e.target.checked;
                    setSendInviteEmails(newVal);

                    try {
                      const supabase = requireSupabase();
                      await supabase.from("notification_preferences").upsert(
                        {
                          user_id: user?.id,
                          send_invite_emails: newVal,
                        },
                        { onConflict: "user_id" }
                      );
                      setNotifSaved(true);
                      setTimeout(() => setNotifSaved(false), 2000);
                    } catch (err) {
                      console.error("Failed to save preference:", err);
                      setSendInviteEmails(!newVal);
                    }
                  }}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0,
                    position: "absolute",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: sendInviteEmails
                      ? "var(--color-accent)"
                      : "var(--color-border)",
                    borderRadius: "12px",
                    transition: "all var(--duration-fast)",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "2px",
                      left: sendInviteEmails ? "22px" : "2px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left var(--duration-fast)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </span>
              </label>
            </div>
            {notifSaved && (
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-success)",
                }}
              >
                Preference saved
              </span>
            )}
          </div>
        </section>

        {/* Danger zone */}
        <section
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-danger)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "var(--space-5) var(--space-6)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <h3
              style={{
                fontSize: "var(--font-size-md)",
                fontWeight: "var(--font-weight-semibold)",
                margin: 0,
                color: "var(--color-danger)",
              }}
            >
              Danger zone
            </h3>
          </div>
          <div
            style={{
              padding: "var(--space-6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-4)",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-medium)",
                  color: "var(--color-text-primary)",
                }}
              >
                Delete account
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                }}
              >
                Permanently delete your account and all data. Cannot be undone.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete account
            </Button>
          </div>
        </section>
      </div>

      {/* Delete account confirmation modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        width={400}
      >
        <h3
          style={{
            fontSize: "var(--font-size-lg)",
            fontWeight: "var(--font-weight-bold)",
            marginBottom: "var(--space-3)",
            color: "var(--color-danger)",
          }}
        >
          Delete your account?
        </h3>
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
            marginBottom: "var(--space-2)",
            lineHeight: "var(--line-height-normal)",
          }}
        >
          This will permanently delete all your notes, folders, and profile
          data. This action cannot be undone.
        </p>
        {deleteError && (
          <div
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-danger)",
              background: "var(--color-danger-subtle)",
              border: "1px solid var(--color-danger)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3) var(--space-4)",
              marginBottom: "var(--space-4)",
            }}
          >
            {deleteError}
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "flex-end",
            marginTop: "var(--space-4)",
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteError("");
            }}
            disabled={deletingAccount}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
          >
            {deletingAccount ? "Deleting…" : "Yes, delete my account"}
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
