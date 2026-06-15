import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui";
import { NoteEditor, SaveIndicator } from "@/components/editor/NoteEditor";
import { useNoteEditor } from "@/hooks/useNoteEditor";
import { useRealtimeCollaboration } from "@/hooks/useRealtimeCollaboration";
import { DraftRestoreBanner } from "@/components/DraftRestoreBanner";
import styles from "@/styles/dashboard.module.css";
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
  const [lastRemoteSaver, setLastRemoteSaver] = useState<string | null>(null);
  const remoteSaveIdRef = useRef(0);

  // ── Realtime collaboration ─────────────────────────────────
  // Subscribe once the note is created (noteId becomes non-null after first save).
  // Broadcast blocks after each auto-save so collaborators see live changes.

  const onBlocksReceived = (
    payload: Parameters<typeof editor.mergeRemoteBlocks>[0],
  ) => {
    editor.mergeRemoteBlocks(payload);
    const savedBy = (payload as { savedBy?: string }).savedBy ?? null;
    remoteSaveIdRef.current += 1;
    setLastRemoteSaver(savedBy ? `${savedBy}::${remoteSaveIdRef.current}` : null);
  }

  const collab = useRealtimeCollaboration({
    noteId: editor.state.noteId,
    userId: user?.id ?? "",
    username: user?.username ?? "User",
    avatarUrl: user?.avatar_url ?? null,
    enabled: !!user && !!editor.state.noteId,
    onBlocksReceived,
  });

  // ── Broadcast helper ───────────────────────────────────────
  // Deduplicates the collab.broadcast() call used in auto-save,
  // manual save, and beforeunload. Recreated every render so
  // closures are always fresh. The beforeunload effect is no-deps
  // so it always captures the latest version.
  const broadcastCurrentState = () => {
    collab.broadcast({
      blocks: editor.state.blocks,
      title: editor.state.title,
      description: editor.state.description,
      savedBy: user?.username ?? "",
      version: editor.contentVersion,
    })
  }

  // ── Broadcast on beforeunload ──────────────────────────────
  // Fire-and-forget: channel.send() returns a Promise but we don't
  // await it because the browser may unload before resolution.
  // No dependency array — re-registers on every render so the
  // handler always captures the latest broadcastCurrentState.
  useEffect(() => {
    if (!editor.state.noteId || !user) return
    const handler = () => { broadcastCurrentState() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  })

  // ── Auto-save with debounce ──
  // Only depends on contentVersion — the deps are intentionally scoped
  // because editor is a render-time object (adding it would recreate the
  // timer on every keystroke). save/isValid are stable callbacks.
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
        broadcastCurrentState();
      } catch {
        // Auto-save failures are silent — manual save will surface errors
      } finally {
        setAutoSaving(false);
      }
    }, AUTO_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, editor.contentVersion, editor.save, editor.isValid]);

  async function handleSave() {
    if (!editor.state.folder_id) {
      setFolderError("Please select a folder.");
      return;
    }
    if (!user) return;
    if (user.is_banned) {
      return; // Account is banned — action prevented server-side
    }
    setFolderError("");
    justManuallySaved.current = true;
    try {
      await editor.save(user.id);
      broadcastCurrentState();
      navigate("/dashboard/notes");
    } catch {
      // Save failure is shown via editor.saveError in the UI
    } finally {
      // Reset manually-saved flag even on failure so auto-save can retry
      justManuallySaved.current = false;
    }
  }

  return (
    <DashboardLayout user={user || fallbackProfile()} variant="user" defaultCollapsed>
      {!user ? (
        <div className={styles.loadingState}>
          Loading editor\u2026
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <DraftRestoreBanner
            draftTimestamp={editor.draftTimestamp}
            onRestore={() => {
              // Draft is already loaded in editor state — dismiss banner
              void editor.draftExists;
            }}
            onDiscard={editor.discardDraft}
          />
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
            collaborators={collab.collaborators}
            broadcastCursor={collab.broadcastCursor}
            remoteCursors={collab.remoteCursors}
            lastRemoteSaver={lastRemoteSaver}
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
          />
        </div>
      )}
    </DashboardLayout>
  );
}
