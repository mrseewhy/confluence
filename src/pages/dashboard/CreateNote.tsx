import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui";
import { NoteEditor, SaveIndicator } from "@/components/editor/NoteEditor";
import { useNoteEditor } from "@/hooks/useNoteEditor";
import { useAuth, fallbackProfile } from "@/context/auth";

const AUTO_SAVE_DELAY_MS = 5000;

export function CreateNote() {
  const { profile } = useAuth();
  const user = profile;
  const navigate = useNavigate();

  const editor = useNoteEditor();
  const justManuallySaved = useRef(false);
  const [autoSaving, setAutoSaving] = useState(false);

  const [folderError, setFolderError] = useState("");

  // ── Auto-save with debounce ──
  // Only depends on contentVersion (a counter bumped on every
  // content change) + the stable save() callback, so the timer
  // isn't re-created on every keystroke.
  useEffect(() => {
    if (!user || !editor.isValid) return;
    const timer = setTimeout(async () => {
      if (justManuallySaved.current) {
        justManuallySaved.current = false;
        return;
      }
      setAutoSaving(true);
      try {
        await editor.save(user.id);
      } catch {
        // Auto-save failures are silent — manual save will surface errors
      } finally {
        setAutoSaving(false);
      }
    }, AUTO_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [user?.id, editor.contentVersion, editor.save, editor.isValid]);

  async function handleSave() {
    if (!editor.state.folder_id) {
      setFolderError("Please select a folder.");
      return;
    }
    if (!user) return;
    if (user.is_banned) {
      console.error("Account is banned — cannot create notes.");
      return;
    }
    setFolderError("");
    justManuallySaved.current = true;
    try {
      await editor.save(user.id);
      navigate("/dashboard/notes");
    } catch (err) {
      console.error("[CreateNote] save failed", err);
    }
  }

  return (
    <DashboardLayout user={user || fallbackProfile()} variant="user" defaultCollapsed>
      {!user ? (
        <div
          style={{
            padding: "var(--space-20)",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          Loading editor…
        </div>
      ) : (
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
          breadcrumbLabel="New note"
          headerActions={
            <>
            <SaveIndicator status={editor.saveStatus} message={editor.saveError} autoSave={autoSaving} />
            <Button
              variant="primary"
              size="sm"
              disabled={!editor.isValid || editor.saveStatus === "saving"}
              onClick={handleSave}
            >
              Create note
            </Button>
          </>
        }
        bottomActions={
          <>
            <SaveIndicator status={editor.saveStatus} message={editor.saveError} autoSave={autoSaving} />
            <Button
                variant="primary"
                size="sm"
                disabled={!editor.isValid || editor.saveStatus === "saving"}
                onClick={handleSave}
              >
                Create note
              </Button>
            </>
          }
        />
      )}
    </DashboardLayout>
  );
}
