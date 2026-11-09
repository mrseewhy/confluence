import { useState, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";
import { diffLines, blocksToLines, isUnchanged, type DiffLine } from "@/lib/diff";
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

const DIFF_COLOR: Record<DiffLine["op"], { bg: string; fg: string; sign: string }> = {
  equal: { bg: "transparent", fg: "var(--color-text-secondary)", sign: " " },
  add: { bg: "rgba(34,197,94,0.12)", fg: "var(--color-text-primary)", sign: "+" },
  remove: { bg: "rgba(239,68,68,0.12)", fg: "var(--color-text-primary)", sign: "-" },
};

export function VersionHistoryModal({ noteId, userId, onClose, onRestore }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffLine[] | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

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

  /** Compare a historical version against what the note looks like now. */
  const handleCompare = async (versionId: string) => {
    if (comparing === versionId) {
      setComparing(null);
      setDiff(null);
      return;
    }
    setComparing(versionId);
    setDiffLoading(true);
    try {
      const supabase = requireSupabase();
      const [versionBlocks, currentBlocks] = await Promise.all([
        supabase.rpc("get_note_version_blocks", { p_version_id: versionId }),
        supabase
          .from("note_blocks")
          .select("type, content, order_index")
          .eq("note_id", noteId)
          .order("order_index"),
      ]);
      if (versionBlocks.error) throw versionBlocks.error;
      if (currentBlocks.error) throw currentBlocks.error;
      const before = blocksToLines(versionBlocks.data as never);
      const after = blocksToLines(currentBlocks.data as never);
      setDiff(diffLines(before, after));
    } catch {
      setError("Failed to compare versions");
      setDiff(null);
    } finally {
      setDiffLoading(false);
    }
  };

  return (
    <Modal title="Version History" isOpen onClose={onClose} width={comparing ? 680 : 400}>
      <div style={{ minWidth: "min(480px, 80vw)", maxHeight: "60vh", overflow: "auto" }}>
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
          <div className={styles.loadingState}>Loading version history…</div>
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
                  padding: "var(--space-3)",
                  background: "var(--color-bg-subtle)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "var(--space-2)",
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
                  <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => void handleCompare(version.id)}
                    >
                      {comparing === version.id ? "Hide" : "Compare"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="xs"
                      disabled={restoring === version.id}
                      onClick={() => void handleRestore(version.id)}
                    >
                      {restoring === version.id ? "Restoring…" : "Restore"}
                    </Button>
                  </div>
                </div>

                {comparing === version.id && (
                  <div style={{ marginTop: "var(--space-3)" }}>
                    {diffLoading ? (
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                        Comparing…
                      </div>
                    ) : diff === null ? null : isUnchanged(diff) ? (
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                        This version matches the current note.
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            fontSize: "var(--font-size-xs)",
                            color: "var(--color-text-muted)",
                            marginBottom: "var(--space-2)",
                          }}
                        >
                          Changes from this version to the current note:
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            maxHeight: "24vh",
                            overflow: "auto",
                            fontSize: "var(--font-size-xs)",
                            fontFamily: "var(--font-mono)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-md)",
                            padding: "var(--space-2)",
                            background: "var(--color-bg-base)",
                          }}
                        >
                          {diff.map((line, i) => {
                            const c = DIFF_COLOR[line.op];
                            return (
                              <div
                                key={`${i}-${line.op}`}
                                style={{
                                  background: c.bg,
                                  color: c.fg,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {c.sign} {line.text}
                              </div>
                            );
                          })}
                        </pre>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
