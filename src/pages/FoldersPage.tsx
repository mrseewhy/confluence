import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge, EmptyState } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";
import { Avatar, OWNER_QUERY } from "@/lib/helpers";

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

interface FolderWithSubfolders extends FolderItem {
  subfolders: FolderItem[];
}

// ─── Dummy Content ────────────────────────────────────────────

const DUMMY_FOLDERS: FolderWithSubfolders[] = [
  {
    id: "d1", title: "general",
    description: "Default folder for all notes and subfolders.",
    slug: "general", note_count: 2,
    owner_id: "u1", owner_name: "Alex Johnson", owner_username: "alex-johnson", owner_avatar: null,
    subfolders: [
      {
        id: "d1a", title: "Getting Started",
        description: "Quick-start guides, onboarding materials, and setup documentation.",
        slug: "getting-started", note_count: 1,
        owner_id: "u1", owner_name: "Alex Johnson", owner_username: "alex-johnson", owner_avatar: null,
      },
      {
        id: "d1b", title: "Templates",
        description: "Reusable note templates for different documentation purposes.",
        slug: "templates", note_count: 1,
        owner_id: "u1", owner_name: "Alex Johnson", owner_username: "alex-johnson", owner_avatar: null,
      },
    ],
  },
  {
    id: "d2", title: "System Architecture",
    description: "Architecture patterns, system design principles, and infrastructure decisions for building scalable applications.",
    slug: "system-architecture", note_count: 2,
    owner_id: "u1", owner_name: "Alex Johnson", owner_username: "alex-johnson", owner_avatar: null,
    subfolders: [
      {
        id: "d2a", title: "Design Patterns",
        description: "Common architectural patterns, their trade-offs, and real-world use cases.",
        slug: "design-patterns", note_count: 1,
        owner_id: "u1", owner_name: "Alex Johnson", owner_username: "alex-johnson", owner_avatar: null,
      },
      {
        id: "d2b", title: "Scaling",
        description: "Horizontal and vertical scaling strategies, load balancing, and caching.",
        slug: "scaling", note_count: 1,
        owner_id: "u1", owner_name: "Alex Johnson", owner_username: "alex-johnson", owner_avatar: null,
      },
    ],
  },
  {
    id: "d3", title: "general",
    description: "Default folder for all notes and subfolders.",
    slug: "general", note_count: 2,
    owner_id: "u2", owner_name: "Sarah Chen", owner_username: "sarah-chen", owner_avatar: null,
    subfolders: [
      {
        id: "d3a", title: "Workflows",
        description: "Daily routines, productivity systems, and process documentation.",
        slug: "workflows", note_count: 1,
        owner_id: "u2", owner_name: "Sarah Chen", owner_username: "sarah-chen", owner_avatar: null,
      },
      {
        id: "d3b", title: "Resources",
        description: "Curated lists of learning materials, tools, and references.",
        slug: "resources", note_count: 1,
        owner_id: "u2", owner_name: "Sarah Chen", owner_username: "sarah-chen", owner_avatar: null,
      },
    ],
  },
  {
    id: "d4", title: "Data Science",
    description: "Machine learning, statistical analysis, data visualisation, and analytical workflows.",
    slug: "data-science", note_count: 2,
    owner_id: "u2", owner_name: "Sarah Chen", owner_username: "sarah-chen", owner_avatar: null,
    subfolders: [
      {
        id: "d4a", title: "Machine Learning",
        description: "Model selection, training pipelines, evaluation metrics, and deployment.",
        slug: "machine-learning", note_count: 1,
        owner_id: "u2", owner_name: "Sarah Chen", owner_username: "sarah-chen", owner_avatar: null,
      },
      {
        id: "d4b", title: "Visualization",
        description: "Chart types, dashboard design, and data storytelling techniques.",
        slug: "visualization", note_count: 1,
        owner_id: "u2", owner_name: "Sarah Chen", owner_username: "sarah-chen", owner_avatar: null,
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────

// (Avatar, OWNER_QUERY imported from @/lib/helpers)

const FOLDER_EMOJIS = ["💻", "🏗️", "🚀", "🎨", "⚙️", "🗄️"];

function getFolderEmoji(index: number): string {
  return FOLDER_EMOJIS[index % FOLDER_EMOJIS.length];
}

// ─── FoldersPage Component ────────────────────────────────────

export function FoldersPage() {
  const [folders, setFolders] = useState<FolderWithSubfolders[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [useDummy, setUseDummy] = useState(false);

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
          setUseDummy(true);
          setFolders(DUMMY_FOLDERS);
          return;
        }

        // Split into roots and subfolders
        const all = data as (Record<string, unknown> & { parent_id: string | null })[];
        const roots = all.filter((f) => !f.parent_id);
        const subfolders = all.filter((f) => f.parent_id);

        // Map owner info
        const mapItem = (f: Record<string, unknown>): FolderItem => {
          const owner = (f.owner as { full_name?: string; avatar_url?: string | null; username?: string | null } | null);
          return {
            id: f.id as string,
            title: f.title as string,
            description: (f.description as string | null) ?? null,
            slug: f.slug as string,
            note_count: 0,
            owner_id: f.owner_id as string,
            owner_name: owner?.full_name || "Unknown",
            owner_username: owner?.username || "unknown",
            owner_avatar: owner?.avatar_url ?? null,
          };
        };

        const mapped: FolderWithSubfolders[] = roots.map((root) => ({
          ...mapItem(root),
          subfolders: subfolders
            .filter((sf) => sf.parent_id === root.id)
            .map(mapItem),
        }));

        setFolders(mapped);
        if (!mapped.length) {
          setUseDummy(true);
          setFolders(DUMMY_FOLDERS);
        }
      } catch {
        if (!mounted) return;
        setUseDummy(true);
        setFolders(DUMMY_FOLDERS);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, []);

  // ─── Filter by search ────────────────────────────────────

  const filtered = search.trim()
    ? folders
        .map((f) => ({
          ...f,
          // When searching, only show subfolders that match (if the root itself doesn't match)
          subfolders: f.title.toLowerCase().includes(search.toLowerCase()) ||
            f.description?.toLowerCase().includes(search.toLowerCase()) ||
            f.owner_name.toLowerCase().includes(search.toLowerCase())
            ? f.subfolders
            : f.subfolders.filter(
                (sf) =>
                  sf.title.toLowerCase().includes(search.toLowerCase()) ||
                  sf.description?.toLowerCase().includes(search.toLowerCase()),
              ),
        }))
        .filter(
          (f) =>
            f.title.toLowerCase().includes(search.toLowerCase()) ||
            f.description?.toLowerCase().includes(search.toLowerCase()) ||
            f.owner_name.toLowerCase().includes(search.toLowerCase()) ||
            f.subfolders.length > 0,
        )
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

        {/* Folder grid */}
        {filtered.length > 0 ? (
          <div style={styles.grid}>
            {filtered.map((folder, index) => (
              <div key={folder.id} style={styles.rootCard}>                  <Link
                    to={`/${folder.owner_username}/folder/${folder.slug}`}
                    style={{ textDecoration: "none" }}
                  >
                  <div style={styles.card} className="folder-card-hover">
                    <div style={styles.cardEmoji}>{getFolderEmoji(index)}</div>

                    <div style={styles.cardBody}>
                      <h3 style={styles.cardTitle}>{folder.title}</h3>
                      {folder.description && (
                        <p style={styles.cardDesc}>{folder.description}</p>
                      )}
                    </div>

                    <div style={styles.cardFooter}>
                      <div style={styles.authorRow}>
                        <Avatar name={folder.owner_name} size={24} />
                        <span style={styles.authorName}>{folder.owner_name}</span>
                      </div>
                      <Badge variant={useDummy ? "accent" : "muted"}>
                        📄 {folder.note_count} notes
                      </Badge>
                    </div>
                  </div>
                </Link>

                {/* Subfolders */}
                {folder.subfolders.length > 0 && (
                  <div style={styles.subfolderSection}>
                    <div style={styles.subfolderList}>
                      {folder.subfolders.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/${sub.owner_username}/folder/${sub.slug}`}
                          style={{ textDecoration: "none" }}
                        >
                          <div style={styles.subfolderCard} className="subfolder-hover">
                            <div style={styles.subfolderTop}>
                              <span style={styles.subfolderIcon}>📂</span>
                              <span style={styles.subfolderTitle}>{sub.title}</span>
                            </div>
                            {sub.description && (
                              <p style={styles.subfolderDesc}>{sub.description}</p>
                            )}
                            <div style={styles.subfolderMeta}>
                              <span style={styles.subfolderAuthor}>
                                <Avatar name={sub.owner_name} size={16} />
                                <span style={styles.subfolderAuthorName}>
                                  {sub.owner_name}
                                </span>
                              </span>
                              <Badge variant="muted" style={{ fontSize: 10, padding: "1px 8px" }}>
                                📄 {sub.note_count}
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
