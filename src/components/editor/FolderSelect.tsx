import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";

interface FolderSelectProps {
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

interface FlatFolder {
  id: string;
  title: string;
  parent_id: string | null;
  depth: number;
  isSubfolder: boolean;
}

export function FolderSelect({ value, onChange, error }: FolderSelectProps) {
  const { profile } = useAuth();
  const [folders, setFolders] = useState<{ id: string; title: string; parent_id: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      try {
        const supabase = requireSupabase();
        const { data } = await supabase
          .from("folders")
          .select("id, title, parent_id")
          .eq("owner_id", profile.id);

        setFolders(data || []);
      } catch (err) {
        console.error("Error loading folders:", err);
      }
    };
    void load();
  }, [profile]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Flatten hierarchy: root folders first, then their children indented
  const flatFolders = useMemo(() => {
    const roots = folders.filter((f) => !f.parent_id);
    const result: FlatFolder[] = [];

    const addChildren = (parentId: string, depth: number) => {
      const children = folders.filter((f) => f.parent_id === parentId);
      for (const child of children) {
        result.push({ id: child.id, title: child.title, parent_id: child.parent_id, depth, isSubfolder: depth > 0 });
        addChildren(child.id, depth + 1);
      }
    };

    for (const root of roots) {
      result.push({ id: root.id, title: root.title, parent_id: root.parent_id, depth: 0, isSubfolder: false });
      addChildren(root.id, 1);
    }

    return result;
  }, [folders]);

  // Filter by search query
  const filteredFolders = useMemo(() => {
    if (!search.trim()) return flatFolders;
    const q = search.toLowerCase();
    return flatFolders.filter((f) => f.title.toLowerCase().includes(q));
  }, [flatFolders, search]);

  const selectedFolder = flatFolders.find((f) => f.id === value);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <label
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-sans)",
        }}
      >
        Folder
      </label>

      <div ref={containerRef} style={{ position: "relative" }}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-3)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-sm)",
            color: selectedFolder ? "var(--color-text-primary)" : "var(--color-text-muted)",
            background: "var(--color-bg-elevated)",
            border: `1px solid ${error ? "var(--color-danger)" : "var(--color-border)"}`,
            borderRadius: "var(--radius-md)",
            padding: "10px var(--space-3)",
            cursor: "pointer",
            outline: "none",
            transition: "border-color var(--duration-fast), box-shadow var(--duration-fast)",
            textAlign: "left",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-subtle)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? "var(--color-danger)" : "var(--color-border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", minWidth: 0 }}>
            {selectedFolder ? (
              <>
                {selectedFolder.isSubfolder && (
                  <span style={{ fontSize: "13px", flexShrink: 0 }}>
                    {"\uD83D\uDCC2"}
                  </span>
                )}
                {!selectedFolder.isSubfolder && (
                  <span style={{ fontSize: "13px", flexShrink: 0 }}>
                    {"\uD83D\uDCC1"}
                  </span>
                )}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedFolder.title}
                </span>
                {selectedFolder.isSubfolder && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "var(--font-weight-semibold)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "var(--color-accent)",
                      background: "var(--color-accent-subtle)",
                      borderRadius: "var(--radius-full)",
                      padding: "1px 7px",
                      border: "1px solid var(--color-accent-muted)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Subfolder
                  </span>
                )}
              </>
            ) : (
              "Select a folder\u2026"
            )}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              flexShrink: 0,
              opacity: 0.5,
              transition: "transform var(--duration-fast)",
              transform: open ? "rotate(180deg)" : undefined,
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-xl)",
              zIndex: 50,
              maxHeight: "280px",
              overflowY: "auto",
              padding: "var(--space-2)",
            }}
          >
          {/* Search input */}
          <div style={{ padding: "0 var(--space-1) var(--space-2)", position: "relative" }}>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search folders…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  // Focus the first folder item
                  const first = containerRef.current?.querySelector('[data-folder-item]') as HTMLElement;
                  first?.focus();
                }
              }}
              style={{
                width: "100%",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-primary)",
                background: "var(--color-bg-base)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3) var(--space-2) var(--space-7)",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
              }}
            />
            {/* Search icon */}
            <svg
              style={{
                position: "absolute",
                left: "9px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.4,
                pointerEvents: "none",
              }}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          {filteredFolders.length === 0 ? (
            <div
              style={{
                padding: "var(--space-6) var(--space-3)",
                textAlign: "center",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
              }}
            >
              {search.trim() ? "No folders match your search" : "No folders yet"}
            </div>
          ) : (
            filteredFolders.map((f) => {
                const isSelected = f.id === value;
                return (                    <button
                      key={f.id}
                      type="button"
                      data-folder-item
                      onClick={() => {
                        onChange(f.id);
                        setOpen(false);
                        setSearch("");
                      }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      width: "100%",
                      padding: "var(--space-2) var(--space-3)",
                      paddingLeft: f.isSubfolder
                        ? `calc(var(--space-3) + ${f.depth} * 20px)`
                        : "var(--space-3)",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      background: isSelected ? "var(--color-accent-subtle)" : "transparent",
                      color: isSelected ? "var(--color-accent)" : "var(--color-text-primary)",
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--font-size-sm)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background var(--duration-fast)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "var(--color-bg-muted)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {/* Indentation branch lines */}
                    {f.isSubfolder && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          alignSelf: "stretch",
                          width: "16px",
                          flexShrink: 0,
                          position: "relative",
                        }}
                      >
                        {/* Vertical guide line above the branch */}
                        <span
                          style={{
                            position: "absolute",
                            left: "7px",
                            top: "0",
                            bottom: "50%",
                            width: "1px",
                            background: "var(--color-border)",
                          }}
                        />
                        {/* Horizontal branch to this item */}
                        <span
                          style={{
                            position: "absolute",
                            left: "7px",
                            right: "0",
                            top: "50%",
                            height: "1px",
                            background: "var(--color-border)",
                          }}
                        />
                      </span>
                    )}

                    {/* Folder icon */}
                    <span style={{ fontSize: "14px", flexShrink: 0, opacity: 0.7 }}>
                      {f.isSubfolder ? "\uD83D\uDCC2" : "\uD83D\uDCC1"}
                    </span>

                    {/* Name */}
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: isSelected ? "var(--font-weight-semibold)" : "var(--font-weight-regular)",
                      }}
                    >
                      {f.title}
                    </span>

                    {/* Subfolder pill */}
                    {f.isSubfolder && (
                      <span
                        style={{
                          marginLeft: "auto",
                          flexShrink: 0,
                          fontSize: "9px",
                          fontWeight: "var(--font-weight-semibold)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          color: isSelected ? "var(--color-accent)" : "var(--color-text-muted)",
                          background: isSelected ? "var(--color-accent-subtle)" : "var(--color-bg-subtle)",
                          borderRadius: "var(--radius-full)",
                          padding: "1px 6px",
                          border: `1px solid ${isSelected ? "var(--color-accent-muted)" : "var(--color-border)"}`,
                        }}
                      >
                        Subfolder
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {error && (
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-danger)",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
