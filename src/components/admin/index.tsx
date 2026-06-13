import { useState, useEffect, useRef } from "react";
import { Icon } from "@/components/layout/DashboardIcon";
import { Badge, Card } from "@/components/ui";

// ===================================================================
// ActionPanel — shared wrapper for quick action cards
// ===================================================================

interface ActionPanelProps {
  title: string;
  description: string;
  icon: string;
  accent: "warning" | "accent" | "danger" | "default";
  children: React.ReactNode;
}

const accentColors: Record<string, { border: string; bg: string; icon: string }> = {
  warning: { border: "var(--color-warning)", bg: "var(--color-warning-subtle)", icon: "var(--color-warning)" },
  accent:  { border: "var(--color-accent-muted)", bg: "var(--color-accent-subtle)", icon: "var(--color-accent)" },
  danger:  { border: "var(--color-danger)", bg: "var(--color-danger-subtle)", icon: "var(--color-danger)" },
  default: { border: "var(--color-border)", bg: "var(--color-bg-muted)", icon: "var(--color-text-secondary)" },
};

export function ActionPanel({ title, description, icon, accent, children }: ActionPanelProps) {
  const c = accentColors[accent];
  return (
    <Card style={{ padding: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <div style={{
          width: "34px", height: "34px", borderRadius: "var(--radius-lg)",
          background: c.bg, border: `1px solid ${c.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: c.icon, flexShrink: 0,
        }}>
          <Icon d={icon} size={15} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)" }}>{title}</h3>
          <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{description}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

// ===================================================================
// ItemSelect — generic searchable dropdown selector
// ===================================================================

export interface SelectItem {
  id: string;
  primary: string;
  secondary?: string;
  badge?: { label: string; variant: "accent" | "warning" | "danger" | "muted" | "default" | "success" };
}

interface ItemSelectProps {
  items: SelectItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  placeholder?: string;
}

export function ItemSelect({ items, selectedId, onSelect, placeholder }: ItemSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = items.find((i) => i.id === selectedId);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = query
    ? items.filter((i) => i.primary.toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)",
          borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
          background: "var(--color-bg-elevated)",
          color: selected ? "var(--color-text-primary)" : "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)", fontFamily: "var(--font-sans)",
          cursor: "pointer", textAlign: "left", transition: "border-color var(--duration-fast)",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {selected ? (selected.secondary ? `${selected.primary} (${selected.secondary})` : selected.primary) : placeholder || "Select…"}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
          background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)",
          maxHeight: "220px", overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          <input
            type="text" placeholder="Search…" value={query}
            onChange={(e) => setQuery(e.target.value)} autoFocus
            style={{
              width: "100%", fontFamily: "var(--font-sans)", fontSize: "var(--font-size-sm)",
              color: "var(--color-text-primary)", background: "var(--color-bg-base)",
              border: "none", borderBottom: "1px solid var(--color-border)",
              padding: "var(--space-2) var(--space-3)", outline: "none", boxSizing: "border-box",
            }}
          />
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length > 0 ? filtered.map((item) => (
              <button
                key={item.id} type="button"
                onClick={() => { onSelect(item.id); setOpen(false); setQuery(""); }}
                style={{
                  display: "block", width: "100%", padding: "var(--space-2) var(--space-3)",
                  border: "none",
                  background: item.id === selectedId ? "var(--color-accent-subtle)" : "transparent",
                  color: "var(--color-text-primary)", fontSize: "var(--font-size-sm)",
                  textAlign: "left", cursor: "pointer", fontFamily: "var(--font-sans)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-muted)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = item.id === selectedId ? "var(--color-accent-subtle)" : "transparent")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span style={{ fontWeight: "var(--font-weight-medium)" }}>{item.primary}</span>
                  {item.badge && <Badge variant={item.badge.variant} style={{ fontSize: "9px" }}>{item.badge.label}</Badge>}
                </div>
                {item.secondary && (
                  <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>{item.secondary}</div>
                )}
              </button>
            )) : (
              <p style={{ padding: "var(--space-4) var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textAlign: "center", margin: 0 }}>
                No matches for "{query}"
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
