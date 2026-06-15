import { useState, useEffect, useRef, useId } from "react";
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = items.find((i) => i.id === selectedId);

  const filtered = query
    ? items.filter((i) => i.primary.toLowerCase().includes(query.toLowerCase()))
    : items;

  const listboxId = useId();

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveIndex(-1);
      // Small delay to allow DOM to render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const option = listRef.current.querySelector(`[data-option-index="${activeIndex}"]`) as HTMLElement | null;
    option?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const selectOption = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          selectOption(filtered[activeIndex].id);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={placeholder || "Select an item"}
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
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Options"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
            background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)",
            maxHeight: "220px", overflow: "hidden", display: "flex", flexDirection: "column",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Search…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
            onKeyDown={handleKeyDown}
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
            style={{
              width: "100%", fontFamily: "var(--font-sans)", fontSize: "var(--font-size-sm)",
              color: "var(--color-text-primary)", background: "var(--color-bg-base)",
              border: "none", borderBottom: "1px solid var(--color-border)",
              padding: "var(--space-2) var(--space-3)", outline: "none", boxSizing: "border-box",
            }}
          />
          <div ref={listRef} style={{ overflowY: "auto", flex: 1 }} role="presentation">
            {filtered.length > 0 ? filtered.map((item, index) => (
              <button
                key={item.id}
                type="button"
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={item.id === selectedId}
                data-option-index={index}
                onClick={() => selectOption(item.id)}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  display: "block", width: "100%", padding: "var(--space-2) var(--space-3)",
                  border: "none",
                  background: activeIndex === index
                    ? "var(--color-bg-muted)"
                    : item.id === selectedId
                      ? "var(--color-accent-subtle)"
                      : "transparent",
                  color: "var(--color-text-primary)", fontSize: "var(--font-size-sm)",
                  textAlign: "left", cursor: "pointer", fontFamily: "var(--font-sans)",
                }}
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
