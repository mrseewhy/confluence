import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";
import styles from "@/styles/dashboard.module.css";

interface Version {
  id: string;
  note_id: string;
  title: string;
  description: string;
  saved_by: string | null;
  saved_by_name: string | null;
  created_at: string;
}

interface VersionHistoryModalProps {
  noteId: string;
  userId: string;
  onClose: () => void;
  onRestore: () => void;
}

export function VersionHistoryModal({ noteId, userId, onClose, onRestore }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const supabase = requireSupabase();
        const { data, error } = await supabase.rpc("get_note_versions", { p_note_id: noteId });
        if (error) throw error;
        setVersions(data || []);
      } catch {
        setError("Failed to load version history");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [noteId]);

  const handleRestore = async (versionId: string) => {
    setRestoring(versionId);
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.rpc("restore_note_version", {
        p_version_id: versionId,
        p_user_id: userId,
      });
      if (error) throw error;
      onRestore();
      onClose();
    } catch {
      setError("Failed to restore version");
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Modal title="Version History" isOpen onClose={onClose}>
      <div style={{ minWidth: "480px", maxHeight: "60vh", overflow: "auto" }}>
        {error && (
          <div className={styles.errorBanner} style={{ marginBottom: "var(--space-3)" }}>
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              style={{
                marginLeft: "var(--space-3)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                fontWeight: "var(--font-weight-bold)",
              }}
            >
              &times;
            </button>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingState}>Loading version history\u2026</div>
        ) : versions.length === 0 ? (
          <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-muted)" }}>
            No versions saved yet. Versions are created automatically when you save changes.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {versions.map((version) => (
              <div
                key={version.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-3)",
                  background: "var(--color-bg-subtle)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)" }}>
                    {version.title}
                  </div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                    {new Date(version.created_at).toLocaleString()}
                    {version.saved_by_name && <> by {version.saved_by_name}</>}
                  </div>
                  {version.description && (
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {version.description}
                    </div>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="xs"
                  disabled={restoring === version.id}
                  onClick={() => handleRestore(version.id)}
                >
                  {restoring === version.id ? "Restoring\u2026" : "Restore"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
