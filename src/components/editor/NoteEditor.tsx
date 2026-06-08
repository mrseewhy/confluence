import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Button, Divider } from "@/components/ui";
import { FolderSelect } from "@/components/editor/FolderSelect";
import { TextBlock } from "@/components/editor/TextBlock";
import { CodeBlock } from "@/components/editor/CodeBlock";
import { ImageBlock } from "@/components/editor/ImageBlock";
import { VideoBlock } from "@/components/editor/VideoBlock";
import { HeadingBlock } from "@/components/editor/HeadingBlock";
import type { BlockType, BlockMetadata, Visibility } from "@/types";
import type { SaveStatus } from "@/hooks/useNoteEditor";

// ── Constants ─────────────────────────────────────────────────

interface BlockConfig {
  type: BlockType;
  label: string;
  icon: string;
  emoji: string;
}

const BLOCK_CONFIGS: BlockConfig[] = [
  { type: "heading", label: "Heading", icon: IC.notes, emoji: "\uD83D\uDCCC" },
  { type: "text", label: "Text", icon: IC.notes, emoji: "\uD83D\uDCDD" },
  { type: "code", label: "Code", icon: IC.overview, emoji: "\uD83D\uDCBB" },
  {
    type: "image",
    label: "Image",
    icon: IC.globe,
    emoji: "\uD83D\uDDBC\uFE0F",
  },
  { type: "video", label: "Video", icon: IC.globe, emoji: "\uD83C\uDFAC" },
];

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  heading: "Heading",
  text: "Text",
  code: "Code",
  image: "Image",
  video: "Video",
};

const BLOCK_TYPE_EMOJIS: Record<BlockType, string> = {
  heading: "\uD83D\uDCCC",
  text: "\uD83D\uDCDD",
  code: "\uD83D\uDCBB",
  image: "\uD83D\uDDBC\uFE0F",
  video: "\uD83C\uDFAC",
};

// ── Sub-components ────────────────────────────────────────────

function SlugField({
  slug,
  onChange,
  username,
  available,
  checking,
}: {
  slug: string;
  onChange: (v: string) => void;
  username: string;
  available?: boolean;
  checking?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  const slugStatusColor = !slug
    ? "var(--color-text-muted)"
    : checking
      ? "var(--color-text-muted)"
      : available
        ? slug
          ? "var(--color-success)"
          : "var(--color-text-muted)"
        : "var(--color-danger)";

  const slugStatusIcon = !slug ? null : checking
    ? null
    : available
      ? null
      : "\u26A0";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-muted)",
          fontFamily: "var(--font-mono)",
          flexShrink: 0,
        }}
      >
        /{username}/n/
      </span>
      {editing ? (
        <input
          autoFocus
          type="text"
          value={slug}
          onChange={(e) =>
            onChange(
              e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "-")
                .replace(/-+/g, "-"),
            )
          }
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setEditing(false);
          }}
          style={{
            flex: "1 1 200px",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-size-sm)",
            color: slug && !available ? "var(--color-danger)" : "var(--color-text-primary)",
            background: "var(--color-bg-elevated)",
            border: `1px solid ${
              slug && !available ? "var(--color-danger)" : "var(--color-accent)"
            }`,
            borderRadius: "var(--radius-md)",
            padding: "var(--space-1) var(--space-2)",
            outline: "none",
            boxShadow: `0 0 0 3px ${
              slug && !available ? "var(--color-danger-subtle)" : "var(--color-accent-subtle)"
            }`,
          }}
        />
      ) : (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-size-sm)",
            color: slugStatusColor,
            wordBreak: "break-all",
          }}
        >
          {slug || "auto-generated-from-title"}
          {slugStatusIcon && (
            <span style={{ marginLeft: "6px" }}>{slugStatusIcon}</span>
          )}
        </span>
      )}
      <button
        onClick={() => setEditing((e) => !e)}
        title={editing ? "Lock slug" : "Edit slug"}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-muted)",
          display: "flex",
          alignItems: "center",
          padding: "2px",
          borderRadius: "var(--radius-sm)",
          transition: "color var(--duration-fast)",
          flexShrink: 0,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = "var(--color-text-primary)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "var(--color-text-muted)")
        }
      >
        {editing ? (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ) : (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        )}
      </button>
      {slug && !editing && (
        <span
          style={{
            fontSize: "11px",
            fontWeight: "var(--font-weight-medium)",
            color: slugStatusColor,
            whiteSpace: "nowrap",
            animation: "fadeIn var(--duration-normal) var(--ease-out)",
          }}
        >
          {checking
            ? "Checking…"
            : available
              ? "Available"
              : "Already taken — edit slug"}
        </span>
      )}
    </div>
  );
}

function VisibilityToggle({
  value,
  onChange,
}: {
  value: "public" | "private";
  onChange: (v: "public" | "private") => void;
}) {
  const pill = (label: string, v: "public" | "private", icon: string) => {
    const active = value === v;
    return (
      <button
        key={v}
        onClick={() => onChange(v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-4)",
          borderRadius: "var(--radius-md)",
          border: `1px solid ${active ? "var(--color-accent-muted)" : "transparent"}`,
          background: active ? "var(--color-accent-subtle)" : "transparent",
          color: active ? "var(--color-accent)" : "var(--color-text-muted)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--font-size-sm)",
          fontWeight: active
            ? "var(--font-weight-semibold)"
            : "var(--font-weight-regular)",
          cursor: "pointer",
          transition: "all var(--duration-fast)",
        }}
      >
        <Icon d={icon} size={13} />
        {label}
      </button>
    );
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <span
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-sans)",
        }}
      >
        Visibility
      </span>
      <div
        style={{
          display: "flex",
          gap: "2px",
          background: "var(--color-bg-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "3px",
          alignSelf: "flex-start",
          border: "1px solid var(--color-border)",
        }}
      >
        {pill(
          "Private",
          "private",
          "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
        )}
        {pill("Public", "public", IC.globe)}
      </div>
    </div>
  );
}

export function SaveIndicator({
  status,
  message,
  autoSave,
}: {
  status: SaveStatus;
  message?: string | null;
  autoSave?: boolean;
}) {
  if (status === "idle") return null;

  if (autoSave) {
    if (status === "saved") {
      return (
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-sans)",
            opacity: 0.7,
          }}
        >
          ✓ Auto-saved
        </span>
      );
    }
    if (status === "saving") {
      return (
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-sans)",
            opacity: 0.6,
          }}
        >
          Auto-saving…
        </span>
      );
    }
  }

  const configMap: Record<string, { text: string; color: string }> = {
    saving: { text: "Saving\u2026", color: "var(--color-text-muted)" },
    saved: { text: "\u2713 Saved", color: "var(--color-success)" },
    error: { text: "\u2717 Error", color: "var(--color-danger)" },
  };
  const config = configMap[status as string];

  if (!config) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "var(--space-1)",
      }}
    >
      <span
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
          color: config.color,
          fontFamily: "var(--font-sans)",
          animation: "fadeIn var(--duration-normal) var(--ease-out)",
        }}
      >
        {config.text}
      </span>
      {status === "error" && message && (
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-danger)",
            fontFamily: "var(--font-sans)",
            maxWidth: "300px",
            textAlign: "right",
            lineHeight: "var(--line-height-normal)",
            animation: "fadeIn var(--duration-normal) var(--ease-out)",
          }}
        >
          {message}
        </span>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────

export interface NoteEditorState {
  title: string;
  description: string;
  slug: string;
  folder_id: string;
  visibility: Visibility;
  blocks: Array<{
    id: string;
    type: BlockType;
    content: string;
    metadata: BlockMetadata;
  }>;
}

export interface NoteEditorActions {
  setTitle: (value: string) => void;
  setSlug: (value: string) => void;
  setDescription: (value: string) => void;
  setFolderId: (value: string) => void;
  setVisibility: (value: Visibility) => void;
  addBlock: (type: BlockType) => void;
  updateBlock: (id: string, content: string) => void;
  updateBlockMeta: (id: string, meta: Partial<BlockMetadata>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, direction: "up" | "down") => void;
  reorderBlock: (fromIndex: number, toIndex: number) => void;
  checkSlugAvailability: (userId: string) => void;
}

interface NoteEditorProps {
  state: NoteEditorState;
  actions: NoteEditorActions;
  /** Error message for the folder selector */
  folderError?: string;
  /** Called when folder changes (to clear errors) */
  onFolderChange?: (id: string) => void;
  /** Breadcrumb label (e.g. "New note" or "Edit note") */
  breadcrumbLabel: string;
  /** Slot for action buttons in the header toolbar */
  headerActions: React.ReactNode;
  /** Bottom action buttons rendered below the add-blocks bar */
  bottomActions?: React.ReactNode;
  /** Current user's username for constructing public URLs */
  username: string;
  /** Current user's ID — needed for slug availability checks */
  userId: string;
  /** Whether the current slug is available (only meaningful when slug is non-empty) */
  slugAvailable?: boolean;
  /** Whether a slug availability check is in flight */
  slugChecking?: boolean;
}

// ── Component ─────────────────────────────────────────────────

export function NoteEditor({
  state,
  actions,
  folderError,
  onFolderChange,
  breadcrumbLabel,
  headerActions,
  bottomActions,
  username,
  userId,
  slugAvailable = true,
  slugChecking = false,
}: NoteEditorProps) {
  const [copied, setCopied] = useState(false);

  // ── Auto-check slug availability on change ──
  useEffect(() => {
    if (state.slug) {
      actions.checkSlugAvailability(userId);
    }
  }, [state.slug, userId, actions.checkSlugAvailability]);

  // ── dnd-kit sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = state.blocks.findIndex(b => b.id === active.id);
      const newIndex = state.blocks.findIndex(b => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        actions.reorderBlock(oldIndex, newIndex);
      }
    }
  };

  return (
    <>
      {/* Header toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-8)",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          <Link
            to="/dashboard/notes"
            style={{ color: "var(--color-text-muted)", textDecoration: "none" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--color-text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--color-text-muted)")
            }
          >
            Notes
          </Link>
          <span style={{ color: "var(--color-border-strong)" }}>/</span>
          <span
            style={{
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
            }}
          >
            {breadcrumbLabel}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          {headerActions}
        </div>
      </div>

      {/* Editor body */}
      <div
        style={{
          maxWidth: "720px",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
        }}
      >
        <div>
          <input
            type="text"
            placeholder="Note title\u2026"
            value={state.title}
            onChange={(e) => actions.setTitle(e.target.value)}
            style={{
              width: "100%",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-3xl)",
              fontWeight: "var(--font-weight-bold)",
              letterSpacing: "var(--letter-spacing-tight)",
              color: "var(--color-text-primary)",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: 0,
              lineHeight: "var(--line-height-tight)",
            }}
          />
          <div style={{ marginTop: "var(--space-2)" }}>
            <SlugField
              slug={state.slug}
              onChange={actions.setSlug}
              username={username}
              available={slugAvailable}
              checking={slugChecking}
            />
          </div>
          {state.visibility === "public" && (
            <div
              style={{
                marginTop: "var(--space-3)",
                background: "var(--color-accent-subtle)",
                border: "1px solid var(--color-accent-muted)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-4)",
                animation: "fadeIn var(--duration-normal) var(--ease-out)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: "13px" }}>{"\uD83C\uDF0E"}</span>
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--color-accent)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Public URL:
                </span>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-accent)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >{`${window.location.origin}/${username}/n/${state.slug || "untitled"}`}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                style={{
                  color: "var(--color-accent)",
                  background: "var(--color-accent-subtle)",
                  border: "none",
                  minWidth: "80px",
                }}
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/${username}/n/${state.slug}`,
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          )}
        </div>

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
            Description
          </label>
          <textarea
            placeholder="A short summary of what this note covers\u2026"
            value={state.description}
            onChange={(e) => actions.setDescription(e.target.value)}
            rows={2}
            style={{
              width: "100%",
              resize: "vertical",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-base)",
              lineHeight: "var(--line-height-normal)",
              color: "var(--color-text-primary)",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3)",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color var(--duration-fast)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent)";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px var(--color-accent-subtle)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "var(--space-6)",
            alignItems: "start",
          }}
        >
          <FolderSelect
            value={state.folder_id}
            onChange={(id) => onFolderChange?.(id)}
            error={folderError}
          />
          <VisibilityToggle
            value={state.visibility}
            onChange={actions.setVisibility}
          />
        </div>
      </div>

      <Divider style={{ margin: "var(--space-8) 0" }} />

      {/* Blocks */}
      <div
        style={{
          maxWidth: "720px",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        {state.blocks.length === 0 && (
          <div
            style={{
              padding: "var(--space-16) var(--space-8)",
              textAlign: "center",
              border: "2px dashed var(--color-border)",
              borderRadius: "var(--radius-xl)",
              color: "var(--color-text-muted)",
            }}
          >
            <p
              style={{
                margin: 0,
                marginBottom: "var(--space-2)",
                fontSize: "32px",
                opacity: 0.4,
              }}
            >
              {"\u2726"}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "var(--font-size-base)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-text-secondary)",
              }}
            >
              No blocks yet
            </p>
            <p
              style={{
                margin: "var(--space-1) 0 0",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
              }}
            >
              Use the buttons below to add text, code, images, or videos.
            </p>
          </div>
        )}

        {state.blocks.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={state.blocks.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {state.blocks.map((block, idx) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  idx={idx}
                  totalBlocks={state.blocks.length}
                  actions={actions}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add block bar */}
      <div
        style={{
          maxWidth: "720px",
          marginTop:
            state.blocks.length > 0 ? "var(--space-4)" : "var(--space-6)",
          padding: "var(--space-4)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            letterSpacing: "var(--letter-spacing-wide)",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
            marginRight: "var(--space-2)",
            whiteSpace: "nowrap",
          }}
        >
          Add block
        </span>
        {BLOCK_CONFIGS.map((cfg) => (
          <button
            key={cfg.type}
            onClick={() => actions.addBlock(cfg.type)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-bg-subtle)",
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              cursor: "pointer",
              transition: "all var(--duration-fast)",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-accent-subtle)";
              e.currentTarget.style.borderColor = "var(--color-accent-muted)";
              e.currentTarget.style.color = "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-bg-subtle)";
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
          >
            <span style={{ fontSize: "13px" }}>{cfg.emoji}</span>+ {cfg.label}
          </button>
        ))}
      </div>

      {/* Bottom actions bar */}
      {bottomActions && (
        <div
          style={{
            maxWidth: "720px",
            marginTop: "var(--space-8)",
            paddingTop: "var(--space-6)",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "var(--space-3)",
          }}
        >
          {bottomActions}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}

// ── Sortable Block ────────────────────────────────────────────

function SortableBlock({
  block,
  idx,
  totalBlocks,
  actions,
}: {
  block: NoteEditorState['blocks'][number];
  idx: number;
  totalBlocks: number;
  actions: NoteEditorActions;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const isFirst = idx === 0;
  const isLast = idx === totalBlocks - 1;
  const isCode = block.type === "code";

  const style: React.CSSProperties = {
    border: `1px solid var(--color-border)`,
    borderRadius: "var(--radius-xl)",
    overflow: "hidden",
    background: isCode ? "var(--color-code-bg)" : "var(--color-bg-elevated)",
    boxShadow: isDragging ? "var(--shadow-lg)" : "var(--shadow-xs)",
    opacity: isDragging ? 0.85 : 1,
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    position: "relative" as const,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-3) var(--space-4)",
          borderBottom: `1px solid ${isCode ? "rgba(255,255,255,0.07)" : "var(--color-border)"}`,
          background: isCode
            ? "rgba(0,0,0,0.3)"
            : "var(--color-bg-subtle)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          {/* Drag handle (6-dot grid) — with dnd-kit listeners */}
          <span
            title="Drag to reorder"
            {...attributes}
            {...listeners}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "20px",
              height: "24px",
              cursor: isDragging ? "grabbing" : "grab",
              color: isCode
                ? "rgba(255,255,255,0.2)"
                : "var(--color-text-muted)",
              opacity: 0.5,
              transition: "opacity var(--duration-fast)",
              flexShrink: 0,
              userSelect: "none",
              touchAction: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="3" cy="2" r="1.2" />
              <circle cx="11" cy="2" r="1.2" />
              <circle cx="3" cy="7" r="1.2" />
              <circle cx="11" cy="7" r="1.2" />
              <circle cx="3" cy="12" r="1.2" />
              <circle cx="11" cy="12" r="1.2" />
            </svg>
          </span>
          <span style={{ fontSize: "14px" }}>{BLOCK_TYPE_EMOJIS[block.type]}</span>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              letterSpacing: "var(--letter-spacing-wide)",
              textTransform: "uppercase",
              color: isCode
                ? "rgba(232,230,242,0.45)"
                : "var(--color-text-muted)",
            }}
          >
            {BLOCK_TYPE_LABELS[block.type]}
          </span>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", gap: "2px" }}
        >
          <button
            onClick={() => actions.moveBlock(block.id, "up")}
            disabled={isFirst}
            title="Move up"
            style={{
              width: "26px",
              height: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              borderRadius: "var(--radius-sm)",
              color: isFirst
                ? isCode ? "rgba(255,255,255,0.12)" : "var(--color-border)"
                : isCode ? "rgba(255,255,255,0.45)" : "var(--color-text-muted)",
              cursor: isFirst ? "default" : "pointer",
              transition: "all var(--duration-fast)",
              fontSize: "14px",
            }}
            onMouseEnter={(e) => {
              if (!isFirst)
                e.currentTarget.style.background = isCode
                  ? "rgba(255,255,255,0.06)"
                  : "var(--color-bg-muted)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {"\u2191"}
          </button>
          <button
            onClick={() => actions.moveBlock(block.id, "down")}
            disabled={isLast}
            title="Move down"
            style={{
              width: "26px",
              height: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              borderRadius: "var(--radius-sm)",
              color: isLast
                ? isCode ? "rgba(255,255,255,0.12)" : "var(--color-border)"
                : isCode ? "rgba(255,255,255,0.45)" : "var(--color-text-muted)",
              cursor: isLast ? "default" : "pointer",
              transition: "all var(--duration-fast)",
              fontSize: "14px",
            }}
            onMouseEnter={(e) => {
              if (!isLast)
                e.currentTarget.style.background = isCode
                  ? "rgba(255,255,255,0.06)"
                  : "var(--color-bg-muted)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {"\u2193"}
          </button>
          <div
            style={{
              width: "1px",
              height: "16px",
              background: isCode ? "rgba(255,255,255,0.1)" : "var(--color-border)",
              margin: "0 var(--space-2)",
            }}
          />
          <button
            onClick={() => actions.removeBlock(block.id)}
            title="Delete block"
            style={{
              width: "26px",
              height: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              borderRadius: "var(--radius-sm)",
              color: isCode ? "rgba(255,255,255,0.35)" : "var(--color-text-muted)",
              cursor: "pointer",
              transition: "all var(--duration-fast)",
              fontSize: "14px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-danger-subtle)";
              e.currentTarget.style.color = "var(--color-danger)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = isCode
                ? "rgba(255,255,255,0.35)"
                : "var(--color-text-muted)";
            }}
          >
            {"\u2715"}
          </button>
        </div>
      </div>
      <div style={{ padding: isCode ? 0 : "var(--space-4)" }}>
        {block.type === "text" && (
          <TextBlock
            content={block.content}
            onChange={(c) => actions.updateBlock(block.id, c)}
          />
        )}
        {block.type === "code" && (
          <CodeBlock
            content={block.content}
            metadata={block.metadata}
            onChange={(c) => actions.updateBlock(block.id, c)}
            onMeta={(m) => actions.updateBlockMeta(block.id, m)}
          />
        )}
        {block.type === "image" && (
          <ImageBlock
            content={block.content}
            metadata={block.metadata}
            onChange={(c) => actions.updateBlock(block.id, c)}
            onMeta={(m) => actions.updateBlockMeta(block.id, m)}
          />
        )}
        {block.type === "video" && (
          <VideoBlock
            content={block.content}
            metadata={block.metadata}
            onChange={(c) => actions.updateBlock(block.id, c)}
            onMeta={(m) => actions.updateBlockMeta(block.id, m)}
          />
        )}
        {block.type === "heading" && (
          <HeadingBlock
            content={block.content}
            metadata={block.metadata}
            onChange={(c) => actions.updateBlock(block.id, c)}
            onMeta={(m) => actions.updateBlockMeta(block.id, m)}
          />
        )}
      </div>
    </div>
  );
}
