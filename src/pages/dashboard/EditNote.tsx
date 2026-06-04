import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui";
import { NoteEditor, SaveIndicator } from "@/components/editor/NoteEditor";
import { useNoteEditor } from "@/hooks/useNoteEditor";
import { useAuth } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";

export function EditNote() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const user = profile;
  const navigate = useNavigate();

  const editor = useNoteEditor();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notOwner, setNotOwner] = useState(false);
  const [folderError, setFolderError] = useState("");

  // Load existing note data
  useEffect(() => {
    if (!slug || !user) return;

    const loadNote = async () => {
      try {
        const supabase = requireSupabase();

        const { data: noteData } = await supabase
          .from("notes")
          .select("*")
          .eq("slug", slug)
          .single();

        if (!noteData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        // Verify ownership
        if (noteData.owner_id !== user.id) {
          setNotOwner(true);
          setLoading(false);
          return;
        }

        // Fetch blocks
        const { data: blocksData } = await supabase
          .from("note_blocks")
          .select("*")
          .eq("note_id", noteData.id)
          .order("order_index", { ascending: true });

        // Pre-populate the editor
        editor.loadFromExisting(noteData, blocksData || []);
      } catch (err) {
        console.error("Error loading note for editing:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    void loadNote();
  }, [slug, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!editor.state.folder_id) {
      setFolderError("Please select a folder.");
      return;
    }
    if (!user) return;
    setFolderError("");
    try {
      await editor.save(user.id, false);
      navigate("/dashboard/notes");
    } catch (err) {
      console.error("[EditNote] save failed", err);
    }
  }

  const sharedUser = user ?? {
    id: "",
    full_name: "User",
    avatar_url: null,
    user_type: "user" as const,
    created_at: "",
  };

  // ── Loading state ──
  if (loading) {
    return (
      <DashboardLayout user={sharedUser} variant="user" defaultCollapsed>
        <div
          style={{
            padding: "var(--space-20)",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          Loading note editor…
        </div>
      </DashboardLayout>
    );
  }

  // ── Not found state ──
  if (notFound) {
    return (
      <DashboardLayout user={sharedUser} variant="user" defaultCollapsed>
        <div style={{ padding: "var(--space-20)", textAlign: "center" }}>
          <h2>Note not found</h2>
          <p style={{ color: "var(--color-text-muted)" }}>
            This note doesn't exist or has been deleted.
          </p>
          <Link to="/dashboard/notes">
            <Button
              variant="primary"
              size="sm"
              style={{ marginTop: "var(--space-4)" }}
            >
              Back to notes
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // ── Not owner state ──
  if (notOwner) {
    return (
      <DashboardLayout user={sharedUser} variant="user" defaultCollapsed>
        <div style={{ padding: "var(--space-20)", textAlign: "center" }}>
          <h2>Access denied</h2>
          <p style={{ color: "var(--color-text-muted)" }}>
            You can only edit your own notes.
          </p>
          <Link to="/dashboard/notes">
            <Button
              variant="primary"
              size="sm"
              style={{ marginTop: "var(--space-4)" }}
            >
              Back to notes
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout user={user} variant="user" defaultCollapsed>
      <NoteEditor
        state={editor.state}
        actions={editor}
        folderError={folderError}
        onFolderChange={(id) => {
          editor.setFolderId(id);
          setFolderError("");
        }}
        breadcrumbLabel="Edit note"
        headerActions={
          <>
            <SaveIndicator status={editor.saveStatus} message={editor.saveError} />
            <Button
              variant="primary"
              size="sm"
              disabled={!editor.isValid || editor.saveStatus === "saving"}
              onClick={handleSave}
            >
              {editor.saveStatus === "saving" ? "Saving\u2026" : "Save changes"}
            </Button>
          </>
        }
        bottomActions={
          <>
            <SaveIndicator status={editor.saveStatus} message={editor.saveError} />
            <Button
              variant="primary"
              size="sm"
              disabled={!editor.isValid || editor.saveStatus === "saving"}
              onClick={handleSave}
            >
              {editor.saveStatus === "saving" ? "Saving\u2026" : "Save changes"}
            </Button>
          </>
        }
      />
    </DashboardLayout>
  );
}
