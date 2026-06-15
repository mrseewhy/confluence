import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button, EmptyState } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/Modal";
import { formatDate } from "@/lib/helpers";
import { PaginationBar } from "@/components/PaginationBar";
import styles from "@/styles/dashboard.module.css";
import type { Note } from "@/types";

const PAGE_SIZE = 20;

export function DashboardTrash() {
  const { profile } = useAuth();
  const user = profile;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [trashAnnounce, setTrashAnnounce] = useState("");

  // Clear ARIA announcement after 3 seconds
  useEffect(() => {
    if (!trashAnnounce) return
    const t = setTimeout(() => setTrashAnnounce(""), 3000)
    return () => clearTimeout(t)
  }, [trashAnnounce])

  const loadTrash = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const supabase = requireSupabase();

      // Count trashed notes
      const { count } = await supabase
        .from("notes")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .not("deleted_at", "is", null);
      setTotalCount(count ?? 0);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("notes")
        .select("*, folder:folders!folder_id(id, title, slug)")
        .eq("owner_id", user.id)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setTrashedNotes(data || []);
    } catch {
      addToast("Failed to load trash", "error");
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  const handleRestore = async (id: string) => {
    try {
      const supabase = requireSupabase();
      // Save deleted_at timestamp for undo
      const { data: note } = await supabase
        .from("notes")
        .select("deleted_at")
        .eq("id", id)
        .single();
      const originalDeletedAt = note?.deleted_at || null;

      const { error } = await supabase
        .from("notes")
        .update({ deleted_at: null })
        .eq("id", id);
      if (error) throw error;
      await loadTrash();
      setTrashAnnounce("Note restored")
      addToast("Note restored", "success", {
        label: "Undo",
        onClick: async () => {
          await supabase
            .from("notes")
            .update({ deleted_at: originalDeletedAt })
            .eq("id", id);
          await loadTrash();
        },
      });
    } catch {
      addToast("Failed to restore note", "error");
    } finally {
      setRestoreId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    setDeleting(true);
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
      await loadTrash();
      setTrashAnnounce("Note permanently deleted")
      addToast("Note permanently deleted", "success");
    } catch {
      addToast("Failed to delete note", "error");
    } finally {
      setDeleting(false);
      setPermanentDeleteId(null);
    }
  };

  const handleCleanupOld = async () => {
    setCleaningUp(true);
    try {
      const supabase = requireSupabase();
      // Call the cleanup function that deletes notes trashed > 30 days
      const { error } = await supabase.rpc("cleanup_trashed_notes");
      if (error) throw error;
      await loadTrash();
      setTrashAnnounce("Old trashed notes cleaned up")
      addToast("Old trashed notes cleaned up", "success");
    } catch {
      addToast("Failed to clean up. Try again.", "error");
    } finally {
      setCleaningUp(false);
    }
  };

  if (!user || loading) {
    return (
      <DashboardLayout user={user || fallbackProfile()} variant="user">
        <div className={styles.loadingState}>Loading trash…</div>
      </DashboardLayout>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <DashboardLayout user={user} variant="user">
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.headerTitle}>Trash</h1>
          <p className={styles.headerSubtitle}>
            {totalCount} trashed note{totalCount !== 1 ? "s" : ""} · Items are permanently deleted after 30 days
          </p>
        </div>
      </div>

      {trashedNotes.length > 0 && (
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <Button variant="secondary" size="xs" disabled={cleaningUp} onClick={handleCleanupOld}>
            {cleaningUp ? "Cleaning…" : "Clean up old items"}
          </Button>
        </div>
      )}

      {trashedNotes.length > 0 ? (
        <div className={styles.tableCard}>
          {/* ARIA live region for trash operation announcements */}
          <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            {trashAnnounce}
          </div>
          <div className={styles.tableHeader} style={{ gridTemplateColumns: "1fr 120px 140px 120px" }}>
            {["Note", "Folder", "Deleted", "Actions"].map((h) => (
              <span className={styles.tableHeaderCell}>{h}</span>
            ))}
          </div>

          {trashedNotes.map((note) => (
            <div
              key={note.id}
              className={styles.tableRow}
              style={{ gridTemplateColumns: "1fr 120px 140px 120px" }}
            >
              <div className={styles.cellFlex}>
                <div className={styles.iconBadge} style={{ background: "var(--color-danger-subtle)", color: "var(--color-danger)" }}>
                  <Icon d={IC.notes} size={15} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <span
                    style={{
                      margin: 0,
                      fontSize: "var(--font-size-sm)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--color-text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                  >
                    {note.title}
                  </span>
                  {note.description && (
                    <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {note.description}
                    </p>
                  )}
                </div>
              </div>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                {note.folder?.title || "—"}
              </span>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                {note.deleted_at ? formatDate(note.deleted_at) : "—"}
              </span>
              <div className={styles.cellActions}>
                <Button
                  variant="accent-ghost"
                  size="xs"
                  onClick={() => handleRestore(note.id)}
                >
                  Restore
                </Button>
                <Button
                  variant="danger"
                  size="xs"
                  onClick={() => setPermanentDeleteId(note.id)}
                >
                  Delete forever
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🗑️"
          title="Trash is empty"
          description="Deleted notes will appear here. They are permanently removed after 30 days."
        />
      )}

      <PaginationBar
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalCount}
        onPageChange={setPage}
        size="md"
      />

      {/* Permanent delete confirmation */}
      <Modal isOpen={!!permanentDeleteId} onClose={() => setPermanentDeleteId(null)} width={400}>
        <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-3)", color: "var(--color-danger)" }}>
          Permanently delete?
        </h3>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--space-4)" }}>
          This will permanently delete this note and all its blocks. This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <Button variant="secondary" size="sm" onClick={() => setPermanentDeleteId(null)}>Cancel</Button>
          <Button variant="danger" size="sm" disabled={deleting} onClick={() => permanentDeleteId && handlePermanentDelete(permanentDeleteId)}>
            {deleting ? "Deleting…" : "Delete forever"}
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
