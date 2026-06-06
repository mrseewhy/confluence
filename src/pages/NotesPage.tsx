import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge, EmptyState } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";
import { Avatar, timeAgo, buildFolderPath, OWNER_QUERY } from "@/lib/helpers";

// ─── Types ────────────────────────────────────────────────────

interface NoteItem {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  updated_at: string;
  owner_id: string;
  owner_name: string;
  owner_username: string;
  owner_avatar: string | null;
  folder_path: { title: string; slug: string }[];
}

// ─── Dummy Content ────────────────────────────────────────────

const DUMMY_NOTES: NoteItem[] = [
  {
    id: "dn1", title: "Brand Identity Guidelines",
    description: "Comprehensive brand guidelines covering logo usage, colour palette, typography, tone of voice, and application examples.",
    slug: "brand-identity-guidelines",
    updated_at: "2025-06-01T10:00:00Z",
    owner_id: "u5", owner_name: "Emma Williams", owner_username: "emma-williams", owner_avatar: null,
    folder_path: [
      { title: "Design Portfolio", slug: "design-portfolio" },
      { title: "Branding", slug: "branding" },
    ],
  },
  {
    id: "dn2", title: "Redesigning a SaaS Dashboard",
    description: "A complete UX case study covering user research, information architecture, prototyping, and usability testing.",
    slug: "redesigning-saas-dashboard",
    updated_at: "2025-05-31T10:00:00Z",
    owner_id: "u5", owner_name: "Emma Williams", owner_username: "emma-williams", owner_avatar: null,
    folder_path: [
      { title: "Design Portfolio", slug: "design-portfolio" },
      { title: "UX Case Studies", slug: "ux-case-studies" },
    ],
  },
  {
    id: "dn3", title: "UI Sketch Ideas",
    description: "Wireframes and rough UI concepts for a reimagined project management dashboard interface.",
    slug: "ui-sketch-ideas",
    updated_at: "2025-05-30T10:00:00Z",
    owner_id: "u5", owner_name: "Emma Williams", owner_username: "emma-williams", owner_avatar: null,
    folder_path: [
      { title: "general", slug: "general" },
      { title: "Sketches", slug: "sketches" },
    ],
  },
  {
    id: "dn4", title: "Design Inspiration Links",
    description: "A running collection of beautifully designed websites, Dribbble shots, and design system references.",
    slug: "design-inspiration-links",
    updated_at: "2025-05-29T10:00:00Z",
    owner_id: "u5", owner_name: "Emma Williams", owner_username: "emma-williams", owner_avatar: null,
    folder_path: [
      { title: "general", slug: "general" },
      { title: "Inspiration", slug: "inspiration" },
    ],
  },
  {
    id: "dn5", title: "Flash Fiction: The Last Light",
    description: "A short story about the final sunset on a distant planet, told through the eyes of the last botanist.",
    slug: "flash-fiction-last-light",
    updated_at: "2025-05-28T10:00:00Z",
    owner_id: "u4", owner_name: "Priya Patel", owner_username: "priya-patel", owner_avatar: null,
    folder_path: [
      { title: "Creative Writing", slug: "creative-writing" },
      { title: "Short Stories", slug: "short-stories" },
    ],
  },
  {
    id: "dn6", title: "A Collection of Poems",
    description: "Original poetry exploring themes of nature, technology, and the spaces between them.",
    slug: "collection-of-poems",
    updated_at: "2025-05-27T10:00:00Z",
    owner_id: "u4", owner_name: "Priya Patel", owner_username: "priya-patel", owner_avatar: null,
    folder_path: [
      { title: "Creative Writing", slug: "creative-writing" },
      { title: "Poetry", slug: "poetry" },
    ],
  },
  {
    id: "dn7", title: "Project Ideas for 2026",
    description: "A brainstorming list of creative projects, writing challenges, and collaboration opportunities for next year.",
    slug: "project-ideas-2026",
    updated_at: "2025-05-26T10:00:00Z",
    owner_id: "u4", owner_name: "Priya Patel", owner_username: "priya-patel", owner_avatar: null,
    folder_path: [
      { title: "general", slug: "general" },
      { title: "Ideas", slug: "ideas" },
    ],
  },
  {
    id: "dn8", title: "Weekly Journal Entry",
    description: "Reflections on the past week, lessons learned, and intentions for the days ahead.",
    slug: "weekly-journal-entry",
    updated_at: "2025-05-25T10:00:00Z",
    owner_id: "u4", owner_name: "Priya Patel", owner_username: "priya-patel", owner_avatar: null,
    folder_path: [
      { title: "general", slug: "general" },
      { title: "Journal", slug: "journal" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────

// (formatDate, timeAgo, Avatar, buildFolderPath, OWNER_QUERY imported from @/lib/helpers)

// ─── NotesPage Component ──────────────────────────────────────

export function NotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const supabase = requireSupabase();

        // Fetch all public folders for building hierarchy
        const { data: allFolders } = await supabase
          .from("folders")
          .select("id, title, slug, parent_id")
          .eq("visibility", "public");

        // Fetch public notes with folder and owner info
        const { data, error } = await supabase
          .from("notes")
          .select(
            `id, title, description, slug, updated_at, owner_id, folder_id,
             folder:folders!folder_id(id, title, slug, parent_id),
             owner:profiles!owner_id(${OWNER_QUERY})`,
          )
          .eq("visibility", "public")
          .order("updated_at", { ascending: false })
          .limit(50);

        if (!mounted) return;

        if (error || !data?.length) {
          setNotes(DUMMY_NOTES);
          return;
        }

        // Build parent map
        const parentMap: Record<string, { id: string; title: string; slug: string; parent_id: string | null }> = {};
        (allFolders ?? []).forEach((f: Record<string, unknown>) => {
          parentMap[f.id as string] = {
            id: f.id as string,
            title: f.title as string,
            slug: f.slug as string,
            parent_id: (f.parent_id as string | null) ?? null,
          };
        });

        const mapped: NoteItem[] = (data as Record<string, unknown>[]).map(
          (n) => {
            const owner = (n.owner as { full_name?: string; avatar_url?: string | null; username?: string | null } | null);
            const folder = (n.folder as { id: string; title: string; slug: string; parent_id: string | null } | null);
            return {
              id: n.id as string,
              title: n.title as string,
              description: (n.description as string | null) ?? null,
              slug: n.slug as string,
              updated_at: n.updated_at as string,
              owner_id: n.owner_id as string,
              owner_name: owner?.full_name || "Unknown",
              owner_username: owner?.username || "unknown",
              owner_avatar: owner?.avatar_url ?? null,
              folder_path: folder ? buildFolderPath(folder.id, folder.title, folder.slug, parentMap) : [],
            };
          },
        );

        setNotes(mapped);
        if (!mapped.length) {
          setNotes(DUMMY_NOTES);
        }
      } catch {
        if (!mounted) return;
        setNotes(DUMMY_NOTES);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, []);

  // ─── Filter by search ────────────────────────────────────

  const filtered = search.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.description?.toLowerCase().includes(search.toLowerCase()) ||
          n.owner_name.toLowerCase().includes(search.toLowerCase()) ||
          n.folder_path.some((f) =>
            f.title.toLowerCase().includes(search.toLowerCase()),
          ),
      )
    : notes;

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
            <h1 style={styles.title}>Public Notes</h1>
            <p style={styles.subtitle}>
              Browse publicly shared notes from the community.
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Search notes by title, author, or folder..."
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
            {filtered.length} note{filtered.length !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Notes list */}
        {filtered.length > 0 ? (
          <div style={styles.list}>
            {filtered.map((note) => (
              <Link
                key={note.id}
                to={`/${note.owner_username}/n/${note.slug}`}
                style={{ textDecoration: "none" }}
              >
                <div style={styles.card} className="note-card-hover">
                  {/* Folder breadcrumb */}
                  {note.folder_path.length > 0 && (
                    <div style={styles.breadcrumb}>
                      <span style={styles.breadcrumbIcon}>📂</span>
                      {note.folder_path.map((seg, i) => (
                        <span
                          key={seg.slug}
                          style={{ display: "inline-flex", alignItems: "center" }}
                        >
                          {i > 0 && <span style={styles.breadcrumbSep}>›</span>}
                          {/* Don't make breadcrumb links stop propagation; use Link component */}
                          {i < note.folder_path.length - 1 ? (
                            <span
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/${note.owner_username}/folder/${seg.slug}`);
                              }}
                              style={styles.breadcrumbLink}
                            >
                              {seg.title}
                            </span>
                          ) : (
                            <span style={styles.breadcrumbCurrent}>
                              {seg.title}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Title & description */}
                  <h3 style={styles.cardTitle}>{note.title}</h3>
                  {note.description && (
                    <p style={styles.cardDesc}>{note.description}</p>
                  )}

                  {/* Footer */}
                  <div style={styles.cardFooter}>
                    <div style={styles.authorRow}>
                      <Avatar name={note.owner_name} size={24} />
                      <span style={styles.authorName}>{note.owner_name}</span>
                    </div>
                    <div style={styles.footerRight}>
                      <Badge variant="muted">
                        {timeAgo(note.updated_at)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📝"
            title={search ? "No notes match your search" : "No public notes yet"}
            description={
              search
                ? 'Try a different search term or clear the filter.'
                : 'Check back later when users publish notes.'
            }
          />
        )}
      </div>

      <Footer />

      <style>{`
        .note-card-hover {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .note-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md) !important;
          border-color: var(--color-accent-muted) !important;
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

  // List
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
  },

  // Card
  card: {
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-xl)",
    padding: "var(--space-5) var(--space-6)",
    boxShadow: "var(--shadow-xs)",
  },

  // Breadcrumb
  breadcrumb: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 2,
    marginBottom: "var(--space-3)",
    fontSize: 12,
  },
  breadcrumbIcon: {
    marginRight: 4,
    fontSize: 13,
  },
  breadcrumbSep: {
    color: "var(--color-text-muted)",
    margin: "0 4px",
    fontSize: 12,
  },
  breadcrumbLink: {
    color: "var(--color-text-muted)",
    textDecoration: "none",
    fontWeight: 500,
    fontSize: 12,
    transition: "color 0.15s",
    cursor: "pointer",
  },
  breadcrumbCurrent: {
    color: "var(--color-accent)",
    fontWeight: 500,
    fontSize: 12,
  },

  // Card content
  cardTitle: {
    fontSize: "var(--font-size-md)",
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

  // Footer
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
  footerRight: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    flexShrink: 0,
  },
};
