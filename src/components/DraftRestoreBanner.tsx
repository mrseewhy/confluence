interface DraftRestoreBannerProps {
  draftTimestamp: number | null;
  onRestore: () => void;
  onDiscard: () => void;
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function DraftRestoreBanner({ draftTimestamp, onRestore, onDiscard }: DraftRestoreBannerProps) {
  const label = draftTimestamp ? timeAgo(draftTimestamp) : null;
  if (!draftTimestamp) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-3) var(--space-4)",
        background: "var(--color-warning-subtle)",
        border: "1px solid var(--color-warning)",
        borderRadius: "var(--radius-lg)",
        gap: "var(--space-4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", minWidth: 0 }}>
        <span style={{ fontSize: "var(--font-size-lg)" }}>&#x1F4DD;</span>
        <div>
          <span
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-warning)",
            }}
          >
            Unsaved draft found
          </span>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
              marginLeft: "var(--space-2)",
            }}
          >
            (saved {label})
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
        <button
          type="button"
          onClick={onDiscard}
          style={{
            fontSize: "var(--font-size-xs)",
            padding: "var(--space-1) var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-base)",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontWeight: "var(--font-weight-medium)",
            transition: "all var(--duration-fast)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-bg-muted)";
            e.currentTarget.style.color = "var(--color-text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-bg-base)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onRestore}
          style={{
            fontSize: "var(--font-size-xs)",
            padding: "var(--space-1) var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-warning)",
            background: "var(--color-warning)",
            color: "var(--color-text-inverted)",
            cursor: "pointer",
            fontWeight: "var(--font-weight-semibold)",
            transition: "all var(--duration-fast)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#A06408";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-warning)";
          }}
        >
          Keep editing
        </button>
      </div>
    </div>
  );
}
