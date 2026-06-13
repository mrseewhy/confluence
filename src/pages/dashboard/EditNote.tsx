import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui";
import { NoteEditor, SaveIndicator } from "@/components/editor/NoteEditor";
import { useNoteEditor } from "@/hooks/useNoteEditor";
import { useAuth, fallbackProfile } from "@/context/auth";
import styles from "@/styles/dashboard.module.css";
import { requireSupabase } from "@/lib/supabase";

const AUTO_SAVE_DELAY_MS = 5000;

export function EditNote() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const user = profile;
  const navigate = useNavigate();

  const editor = useNoteEditor();
  const justManuallySaved = useRef(false);
  const [autoSaving, setAutoSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notOwner, setNotOwner] = useState(false);
  const [folderError, setFolderError] = useState("");

  // Load existing note data
  const { loadFromExisting } = editor;
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
        loadFromExisting(noteData, blocksData || []);
      } catch (err) {
        console.error("Error loading note for editing:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    void loadNote();
  }, [slug, user, loadFromExisting]);

  // ── Auto-save with debounce (only after initial load) ──
  // Only depends on contentVersion + stable save() + loading,
  // so the timer isn't re-created on every keystroke.
  useEffect(() => {
    if (!user || !editor.isValid || loading) return;
    const timer = setTimeout(async () => {
      if (justManuallySaved.current) {
        justManuallySaved.current = false;
        return;
      }
      setAutoSaving(true);
      try {
        await editor.save(user.id);
      } catch {
        // Auto-save failures are silent
      } finally {
        setAutoSaving(false);
      }
    }, AUTO_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [user?.id, loading, editor.contentVersion, editor.save, editor.isValid]);

  async function handleSave() {
    if (!editor.state.folder_id) {
      setFolderError("Please select a folder.");
      return;
    }
    if (!user) return;
    setFolderError("");
    justManuallySaved.current = true;
    try {
      await editor.save(user.id);
      navigate("/dashboard/notes");
    } catch (err) {
      console.error("[EditNote] save failed", err);
    }
  }

  const sharedUser = user ?? fallbackProfile({ full_name: "User" });

  // ── Loading state ──
  if (loading) {
    return (
      <DashboardLayout user={sharedUser} variant="user" defaultCollapsed>
        <div className={styles.loadingState}>
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

  return (
    <DashboardLayout user={user || sharedUser} variant="user" defaultCollapsed>
      {!user ? null : (
        <NoteEditor
          state={editor.state}
          actions={editor}
          folderError={folderError}
          onFolderChange={(id) => {
            editor.setFolderId(id);
            setFolderError("");
          }}
          username={user.username}
          userId={user.id}
          slugAvailable={editor.slugAvailable}
          slugChecking={editor.slugChecking}
          breadcrumbLabel="Edit note"
          headerActions={
            <>
            <SaveIndicator status={editor.saveStatus} message={editor.saveError} autoSave={autoSaving} />
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
      )}
    </DashboardLayout>
  );
}
