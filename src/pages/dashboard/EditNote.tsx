import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui";
import { NoteEditor, SaveIndicator } from "@/components/editor/NoteEditor";
import { useNoteEditor } from "@/hooks/useNoteEditor";
import { useRealtimeCollaboration } from "@/hooks/useRealtimeCollaboration";
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
  const [lastRemoteSaver, setLastRemoteSaver] = useState<string | null>(null);
  const remoteSaveIdRef = useRef(0);

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

        // Verify ownership — or editor collaborator access
        if (noteData.owner_id !== user.id) {
          // Check if user is a collaborator with edit access
          const { data: authData } = await supabase.auth.getUser();
          const userEmail = authData?.user?.email;
          if (!userEmail) {
            setNotOwner(true);
            setLoading(false);
            return;
          }
          const { data: collab } = await supabase
            .from("collaborators")
            .select("access_level")
            .eq("note_id", noteData.id)
            .eq("invitee_email", userEmail)
            .maybeSingle();
          if (!collab) {
            setNotOwner(true);
            setLoading(false);
            return;
          }
          // Any collaborator (viewer or editor) can open the edit page.
          // Write access is enforced server-side by replace_note_blocks.
        }

        // Fetch blocks
        const { data: blocksData } = await supabase
          .from("note_blocks")
          .select("*")
          .eq("note_id", noteData.id)
          .order("order_index", { ascending: true });

        // Pre-populate the editor
        loadFromExisting(noteData, blocksData || []);
    } catch {
      setNotFound(true);
    } finally {
        setLoading(false);
      }
    };

    void loadNote();
  }, [slug, user, loadFromExisting]);

  // ── Realtime collaboration ─────────────────────────────────
  // Subscribe to the note's Realtime channel once the note ID is
  // known (after load). Broadcast blocks on auto-save and merge
  // remote blocks when received.

  const onBlocksReceived = (
    payload: Parameters<typeof editor.mergeRemoteBlocks>[0],
  ) => {
    editor.mergeRemoteBlocks(payload);
    const savedBy = (payload as { savedBy?: string }).savedBy ?? null;
    // Use a ref counter to force re-render even for same user
    remoteSaveIdRef.current += 1;
    setLastRemoteSaver(savedBy ? `${savedBy}::${remoteSaveIdRef.current}` : null);
  }

  const collab = useRealtimeCollaboration({
    noteId: editor.state.noteId,
    userId: user?.id ?? "",
    username: user?.username ?? "User",
    avatarUrl: user?.avatar_url ?? null,
    enabled: !loading && !!user && !!editor.state.noteId,
    onBlocksReceived,
  });

  // ── Broadcast helper ───────────────────────────────────────
  // Deduplicates the collab.broadcast() call used in auto-save,
  // manual save, and beforeunload.  Recreated every render so
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

  // ── Auto-save with debounce (only after initial load) ──
  // Only depends on contentVersion — the deps are intentionally scoped
  // because editor is a render-time object. save/isValid are stable.
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
        broadcastCurrentState();
      } catch {
        // Auto-save failures are silent
      } finally {
        setAutoSaving(false);
      }
    }, AUTO_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading, editor.contentVersion, editor.save, editor.isValid]);

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
            You can only edit your own notes or notes you have editor access to.
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
          collaborators={collab.collaborators}
          broadcastCursor={collab.broadcastCursor}
          remoteCursors={collab.remoteCursors}
          lastRemoteSaver={lastRemoteSaver}
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
