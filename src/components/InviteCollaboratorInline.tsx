import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";

interface InviteCollaboratorInlineProps {
  noteId: string;
  noteTitle: string;
  noteSlug: string;
  ownerUsername: string;
  ownerId?: string;
  onInvited: (collab: { email: string; accessLevel: string }) => void;
}

export function InviteCollaboratorInline({
  noteId,
  noteTitle,
  noteSlug,
  ownerId,
  onInvited,
}: InviteCollaboratorInlineProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) return;
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setInviting(true);
    try {
      const supabase = requireSupabase();

      const newCollab = {
        inviter_id: ownerId || "",
        invitee_email: email.trim().toLowerCase(),
        folder_id: null,
        note_id: noteId,
        access_level: role,
      };

      const { error: insertError } = await supabase
        .from("collaborators")
        .insert(newCollab);

      if (insertError) throw insertError;

      // Log to activity log
      try {
        await supabase.from("activity_log").insert({
          inviter_id: ownerId || "",
          invitee_email: email.trim().toLowerCase(),
          action: "invited",
          folder_id: null,
          note_id: noteId,
          access_level: role,
          item_title: noteTitle,
          item_slug: noteSlug,
          item_type: "note",
        });
      } catch {
        // fire-and-forget
      }

      onInvited({ email: email.trim().toLowerCase(), accessLevel: role });
      setEmail("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to invite collaborator.");
    } finally {
      setInviting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: "var(--space-2)",
        alignItems: "flex-end",
        marginBottom: "var(--space-4)",
        padding: "var(--space-3)",
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div style={{ flex: 1 }}>
        <Input
          label="Invite by email"
          placeholder="collaborator@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          error={error}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        <label
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-text-muted)",
          }}
        >
          Role
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "viewer" | "editor")}
          style={{
            height: "42px",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-primary)",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "0 var(--space-3)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
      </div>
      <Button type="submit" variant="primary" size="sm" disabled={inviting}>
        {inviting ? "Inviting…" : "Invite"}
      </Button>
    </form>
  );
}
