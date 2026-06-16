import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge, EmptyState } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";
import { OWNER_QUERY } from "@/lib/helpers";
import { Avatar } from "@/components/Avatar";
import { SeoHead } from "@/components/SeoHead";

// ─── Types ────────────────────────────────────────────────────

interface FolderItem {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  note_count: number;
  owner_id: string;
  owner_name: string;
  owner_username: string;
  owner_avatar: string | null;
}

interface FlatFolderRecord {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  parent_id: string | null;
  owner_id: string;
  owner: { full_name?: string; avatar_url?: string | null; username?: string | null }[];
}

interface FolderTreeNode extends FolderItem {
  children: FolderTreeNode[];
  depth: number;
}

// ─── Helpers ──────────────────────────────────────────────────

// (Avatar, OWNER_QUERY imported from @/lib/helpers)

const FOLDER_EMOJIS = ["💻", "🏗️", "🚀", "🎨", "⚙️", "🗄️"];

function getFolderEmoji(index: number): string {
  return FOLDER_EMOJIS[index % FOLDER_EMOJIS.length];
}

// ─── Recursive folder card ────────────────────────────────────

function FolderTreeCard({ folder, index, depth = 0 }: { folder: FolderTreeNode; index: number; depth?: number }) {
  const indent = depth * 24;
  return (
    <div>
      <Link
        to={`/${folder.owner_username}/folder/${folder.slug}`}
        style={{ textDecoration: "none", display: "block", marginLeft: indent }}
      >
        <div style={{ ...styles.card, ...(depth > 0 ? styles.subfolderCard : {}) }} className="folder-card-hover">
          <div style={styles.cardEmoji}>{depth === 0 ? getFolderEmoji(index) : "📂"}</div>
          <div style={styles.cardBody}>
            <h3 style={styles.cardTitle}>{folder.title}</h3>
            {folder.description && <p style={styles.cardDesc}>{folder.description}</p>}
          </div>
          <div style={styles.cardFooter}>
            <div style={styles.authorRow}>
              <Avatar name={folder.owner_name} size={depth === 0 ? 24 : 20} />
              <span style={styles.authorName}>{folder.owner_name}</span>
            </div>
            <Badge variant="muted">📄 {folder.note_count} notes</Badge>
          </div>
        </div>
      </Link>
      {folder.children.length > 0 && (
        <div style={{ marginTop: "var(--space-2)" }}>
          {folder.children.map((child, i) => (
            <FolderTreeCard key={child.id} folder={child} index={i} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FoldersPage Component ────────────────────────────────────

export function FoldersPage() {
  const [folders, setFolders] = useState<FolderTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const supabase = requireSupabase();

        // Fetch ALL public folders (roots + subfolders)
        const { data, error } = await supabase
          .from("folders")
          .select(
            `id, title, description, slug, owner_id, parent_id,
             owner:profiles!owner_id(${OWNER_QUERY})`,
          )
          .eq("visibility", "public")
          .order("title", { ascending: true });

        if (!mounted) return;

        if (error || !data?.length) {
          setFolders([]);
          return;
        }

        const all = data as FlatFolderRecord[];

        const mapItem = (f: FlatFolderRecord): FolderItem => {
          const owner = f.owner?.[0] ?? null;
          return {
            id: f.id,
            title: f.title,
            description: f.description ?? null,
            slug: f.slug,
            note_count: 0,
            owner_id: f.owner_id,
            owner_name: owner?.full_name || "Unknown",
            owner_username: owner?.username || "unknown",
            owner_avatar: owner?.avatar_url ?? null,
          };
        };

        function buildTree(parentId: string | null, depth: number): FolderTreeNode[] {
          return all
            .filter((f) => f.parent_id === parentId)
            .map((f) => ({
              ...mapItem(f),
              children: buildTree(f.id, depth + 1),
              depth,
            }));
        }

        setFolders(buildTree(null, 0));
      } catch {
        if (!mounted) return;
        setFolders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, []);

  // ─── Filter by search ────────────────────────────────────

  function matchesSearch(item: FolderTreeNode): boolean {
    const q = search.toLowerCase();
    return item.title.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.owner_name.toLowerCase().includes(q) ||
      item.children.some(matchesSearch);
  }

  const filtered = search.trim()
    ? folders
        .map((f) => {
          const filteredChildren = f.children.filter(matchesSearch);
          return { ...f, children: filteredChildren };
        })
        .filter(matchesSearch)
    : folders;

  // ─── Loader ──────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={styles.loader}>
          <div style={styles.loaderSpinner} />
        </div>
        <Footer />
      </>
    );
  }

  // ─── Render ──────────────────────────────────────────────

  return (
    <>
      <SeoHead title="Public Folders" description="Browse public folders shared by the community." />
      <Navbar />

      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Public Folders</h1>
            <p style={styles.subtitle}>
              Browse shared knowledge spaces from the community.
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search folders by name, description, or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={styles.searchClear}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Results count */}
        {search && (
          <p style={styles.resultCount}>
            {filtered.length} folder{filtered.length !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Folder grid — recursive tree */}
        {filtered.length > 0 ? (
          <div style={styles.grid}>
            {filtered.map((folder, index) => (
              <FolderTreeCard key={folder.id} folder={folder} index={index} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📁"
            title={search ? "No folders match your search" : "No public folders yet"}
            description={
              search
                ? 'Try a different search term or clear the filter.'
                : 'Check back later when users publish folders.'
            }
          />
        )}
      </div>

      <Footer />

      <style>{`
        .folder-card-hover {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .folder-card-hover:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-lg) !important;
          border-color: var(--color-accent-muted) !important;
        }
        .folder-card-hover:hover .card-emoji {
          transform: scale(1.15);
        }
        .subfolder-hover {
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .subfolder-hover:hover {
          border-color: var(--color-accent-muted) !important;
          background: var(--color-bg-elevated) !important;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: var(--color-text-muted); opacity: 0.7; }
      `}</style>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  loader: {
    minHeight: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loaderSpinner: {
    width: 28,
    height: 28,
    border: "3px solid var(--color-border)",
    borderTopColor: "var(--color-accent)",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },

  page: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "var(--space-16) var(--space-8)",
    minHeight: "90vh",
  },

  header: {
    marginBottom: "var(--space-8)",
  },
  title: {
    fontSize: "var(--font-size-3xl)",
    fontWeight: 700,
    color: "var(--color-text-primary)",
    margin: 0,
  },
  subtitle: {
    fontSize: "var(--font-size-base)",
    color: "var(--color-text-muted)",
    margin: "var(--space-2) 0 0",
  },

  // Search
  searchWrapper: {
    position: "relative",
    marginBottom: "var(--space-6)",
  },
  searchIcon: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 15,
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    fontFamily: "var(--font-sans)",
    fontSize: "var(--font-size-base)",
    color: "var(--color-text-primary)",
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-xl)",
    padding: "12px 40px 12px 44px",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  searchClear: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "var(--color-bg-muted)",
    border: "none",
    borderRadius: "50%",
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 11,
    color: "var(--color-text-muted)",
    fontFamily: "var(--font-sans)",
  },
  resultCount: {
    fontSize: "var(--font-size-sm)",
    color: "var(--color-text-muted)",
    marginBottom: "var(--space-4)",
  },

  // Grid (one column with nested subfolders)
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5)",
  },

  // Root card container
  rootCard: {
    display: "flex",
    flexDirection: "column",
  },

  // Root folder card
  card: {
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-xl)",
    padding: "var(--space-6)",
    boxShadow: "var(--shadow-xs)",
    display: "flex",
    flexDirection: "column",
  },
  cardEmoji: {
    fontSize: 32,
    marginBottom: "var(--space-4)",
    transition: "transform 0.2s ease",
    lineHeight: 1,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: "var(--font-size-lg)",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: "0 0 var(--space-2)",
    lineHeight: 1.3,
  },
  cardDesc: {
    fontSize: "var(--font-size-sm)",
    color: "var(--color-text-secondary)",
    margin: 0,
    lineHeight: 1.55,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "var(--space-4)",
    paddingTop: "var(--space-3)",
    borderTop: "1px solid var(--color-border-subtle)",
    gap: "var(--space-2)",
  },
  authorRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    minWidth: 0,
    flex: 1,
  },
  authorName: {
    fontSize: "var(--font-size-xs)",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    fontFamily: "var(--font-sans)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  // Subfolder section
  subfolderSection: {
    marginTop: "var(--space-2)",
    marginLeft: "var(--space-8)",
    paddingLeft: "var(--space-4)",
    borderLeft: "2px solid var(--color-border-subtle)",
  },
  subfolderList: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
  },
  subfolderCard: {
    background: "var(--color-bg-base)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-4) var(--space-5)",
    cursor: "pointer",
  },
  subfolderTop: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    marginBottom: "var(--space-1)",
  },
  subfolderIcon: {
    fontSize: 16,
    lineHeight: 1,
  },
  subfolderTitle: {
    fontSize: "var(--font-size-sm)",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-sans)",
  },
  subfolderDesc: {
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-secondary)",
    margin: 0,
    lineHeight: 1.5,
    display: "-webkit-box",
    WebkitLineClamp: 1,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  subfolderMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "var(--space-2)",
    gap: "var(--space-2)",
  },
  subfolderAuthor: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-1)",
  },
  subfolderAuthorName: {
    fontSize: 10,
    fontWeight: 500,
    color: "var(--color-text-muted)",
    fontFamily: "var(--font-sans)",
  },
};
