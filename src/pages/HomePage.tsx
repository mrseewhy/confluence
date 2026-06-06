import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button, Badge } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";
import { Avatar, timeAgo, buildFolderPath, OWNER_QUERY, mapOwner } from "@/lib/helpers";

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
  folder_id: string;
  folder_title: string;
  folder_slug: string;
  folder_path: { title: string; slug: string }[];
}

// ─── Dummy Content ────────────────────────────────────────────

const DUMMY_FOLDERS: FolderItem[] = [
  {
    id: "d1", title: "general",
    description: "Default folder for all notes and subfolders.",
    slug: "general", note_count: 2,
    owner_id: "u1", owner_name: "Alex Johnson", owner_username: "alex-johnson", owner_avatar: null,
  },
  {
    id: "d2", title: "System Architecture",
    description: "Architecture patterns, system design principles, and infrastructure decisions for building scalable applications.",
    slug: "system-architecture", note_count: 2,
    owner_id: "u1", owner_name: "Alex Johnson", owner_username: "alex-johnson", owner_avatar: null,
  },
  {
    id: "d3", title: "general",
    description: "Default folder for all notes and subfolders.",
    slug: "general", note_count: 2,
    owner_id: "u2", owner_name: "Sarah Chen", owner_username: "sarah-chen", owner_avatar: null,
  },
  {
    id: "d4", title: "Data Science",
    description: "Machine learning, statistical analysis, data visualisation, and analytical workflows.",
    slug: "data-science", note_count: 2,
    owner_id: "u2", owner_name: "Sarah Chen", owner_username: "sarah-chen", owner_avatar: null,
  },
  {
    id: "d5", title: "general",
    description: "Default folder for all notes and subfolders.",
    slug: "general", note_count: 2,
    owner_id: "u3", owner_name: "Marcus Rivera", owner_username: "marcus-rivera", owner_avatar: null,
  },
  {
    id: "d6", title: "Product Management",
    description: "Product strategy, roadmaps, user research, and go-to-market planning.",
    slug: "product-management", note_count: 2,
    owner_id: "u3", owner_name: "Marcus Rivera", owner_username: "marcus-rivera", owner_avatar: null,
  },
];

const DUMMY_NOTES: NoteItem[] = [
  {
    id: "dn1", title: "Brand Identity Guidelines",
    description: "Comprehensive brand guidelines covering logo usage, colour palette, typography, tone of voice, and application examples.", slug: "brand-identity-guidelines",
    updated_at: "2025-06-01T10:00:00Z",
    owner_id: "u5", owner_name: "Emma Williams", owner_username: "emma-williams", owner_avatar: null,
    folder_id: "dbrand", folder_title: "Branding", folder_slug: "branding",
    folder_path: [
      { title: "Design Portfolio", slug: "design-portfolio" },
      { title: "Branding", slug: "branding" },
    ],
  },
  {
    id: "dn2", title: "Redesigning a SaaS Dashboard",
    description: "A complete UX case study covering user research, information architecture, prototyping, and usability testing.", slug: "redesigning-saas-dashboard",
    updated_at: "2025-05-31T10:00:00Z",
    owner_id: "u5", owner_name: "Emma Williams", owner_username: "emma-williams", owner_avatar: null,
    folder_id: "dux", folder_title: "UX Case Studies", folder_slug: "ux-case-studies",
    folder_path: [
      { title: "Design Portfolio", slug: "design-portfolio" },
      { title: "UX Case Studies", slug: "ux-case-studies" },
    ],
  },
  {
    id: "dn3", title: "UI Sketch Ideas",
    description: "Wireframes and rough UI concepts for a reimagined project management dashboard interface.", slug: "ui-sketch-ideas",
    updated_at: "2025-05-30T10:00:00Z",
    owner_id: "u5", owner_name: "Emma Williams", owner_username: "emma-williams", owner_avatar: null,
    folder_id: "dsketches", folder_title: "Sketches", folder_slug: "sketches",
    folder_path: [
      { title: "general", slug: "general" },
      { title: "Sketches", slug: "sketches" },
    ],
  },
  {
    id: "dn4", title: "Design Inspiration Links",
    description: "A running collection of beautifully designed websites, Dribbble shots, and design system references.", slug: "design-inspiration-links",
    updated_at: "2025-05-29T10:00:00Z",
    owner_id: "u5", owner_name: "Emma Williams", owner_username: "emma-williams", owner_avatar: null,
    folder_id: "dinsp", folder_title: "Inspiration", folder_slug: "inspiration",
    folder_path: [
      { title: "general", slug: "general" },
      { title: "Inspiration", slug: "inspiration" },
    ],
  },
  {
    id: "dn5", title: "Flash Fiction: The Last Light",
    description: "A short story about the final sunset on a distant planet, told through the eyes of the last botanist.", slug: "flash-fiction-last-light",
    updated_at: "2025-05-28T10:00:00Z",
    owner_id: "u4", owner_name: "Priya Patel", owner_username: "priya-patel", owner_avatar: null,
    folder_id: "dstories", folder_title: "Short Stories", folder_slug: "short-stories",
    folder_path: [
      { title: "Creative Writing", slug: "creative-writing" },
      { title: "Short Stories", slug: "short-stories" },
    ],
  },
  {
    id: "dn6", title: "A Collection of Poems",
    description: "Original poetry exploring themes of nature, technology, and the spaces between them.", slug: "collection-of-poems",
    updated_at: "2025-05-27T10:00:00Z",
    owner_id: "u4", owner_name: "Priya Patel", owner_username: "priya-patel", owner_avatar: null,
    folder_id: "dpoetry", folder_title: "Poetry", folder_slug: "poetry",
    folder_path: [
      { title: "Creative Writing", slug: "creative-writing" },
      { title: "Poetry", slug: "poetry" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────

// (formatDate, timeAgo, Avatar, buildFolderPath, OWNER_QUERY, mapOwner imported from @/lib/helpers)

// ─── Static Content ───────────────────────────────────────────

const FEATURES = [
  {
    icon: "📁",
    title: "Folders & Subfolders",
    description: "Organise your notes into folders and subfolders. Build any hierarchy that fits your mental model.",
  },
  {
    icon: "⚡",
    title: "Block-based Editor",
    description: "Mix text, code, images, and videos in a single note. Every block renders exactly as intended.",
  },
  {
    icon: "🔒",
    title: "Public or Private",
    description: "Keep notes private for yourself or share them publicly with a clean, permanent URL.",
  },
  {
    icon: "💻",
    title: "Syntax Highlighting",
    description: "Code blocks with language-aware highlighting. Supports dozens of programming languages.",
  },
  {
    icon: "🔗",
    title: "Shareable Links",
    description: "Every public note gets a clean slug-based URL you can drop into any chat or email.",
  },
  {
    icon: "🌐",
    title: "Works for Everyone",
    description: "Docs, tutorials, research, onboarding — Confluence adapts to how you think and work.",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Create a folder", description: "Group related notes under a topic, project, or subject." },
  { step: "02", title: "Add subfolders", description: "Break it down further with nested subfolders for better organisation." },
  { step: "03", title: "Write your notes", description: "Use text, code, images, and video blocks to build rich content." },
  { step: "04", title: "Share or keep private", description: "Control visibility per folder and per note." },
];

// ─── HomePage Component ───────────────────────────────────────

export function HomePage() {
  const [folders, setFolders] = useState<FolderItem[]>(DUMMY_FOLDERS);
  const [notes, setNotes] = useState<NoteItem[]>(DUMMY_NOTES);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const supabase = requireSupabase();

        const [folderResult, allFoldersResult, noteResult] = await Promise.all([
          supabase
            .from("folders")
            .select(
              `id, title, description, slug, owner_id, parent_id,
               owner:profiles!owner_id(${OWNER_QUERY})`,
            )
            .is("parent_id", null)
            .eq("visibility", "public")
            .order("updated_at", { ascending: false })
            .limit(6),
          supabase
            .from("folders")
            .select("id, title, slug, parent_id, owner_id")
            .eq("visibility", "public"),
          supabase
            .from("notes")
            .select(
              `id, title, description, slug, updated_at, owner_id, folder_id,
               folder:folders!folder_id(id, title, slug, parent_id),
               owner:profiles!owner_id(${OWNER_QUERY})`,
            )
            .eq("visibility", "public")
            .order("updated_at", { ascending: false })
            .limit(6),
        ]);

        if (!mounted) return;

        // ── Resolve folders ──
        if (!folderResult.error && folderResult.data?.length) {
          const parentMap: Record<string, { id: string; title: string; slug: string; parent_id: string | null }> = {};
          (allFoldersResult.data ?? []).forEach((f: Record<string, unknown>) => {
            parentMap[f.id as string] = {
              id: f.id as string,
              title: f.title as string,
              slug: f.slug as string,
              parent_id: (f.parent_id as string | null) ?? null,
            };
          });
          (folderResult.data ?? []).forEach((f: Record<string, unknown>) => {
            parentMap[f.id as string] = {
              id: f.id as string,
              title: f.title as string,
              slug: f.slug as string,
              parent_id: null,
            };
          });

          const mappedFolders: FolderItem[] = (folderResult.data ?? []).map(
            (f: Record<string, unknown>) => {
              const owner = mapOwner(f.owner as { full_name?: string; avatar_url?: string | null; username?: string | null } | null, "Unknown");
              return {
                id: f.id as string,
                title: f.title as string,
                description: (f.description as string | null) ?? null,
                slug: f.slug as string,
                note_count: 0,
                owner_id: f.owner_id as string,
                owner_name: owner.name,
                owner_username: (f.owner as { username?: string } | null)?.username || "unknown",
                owner_avatar: owner.avatar,
              };
            },
          );

          if (mounted) {
            setFolders(mappedFolders);
            setFoldersLoading(false);
          }
        } else if (mounted) {
          setFoldersLoading(false);
        }

        // ── Resolve notes ──
        if (!noteResult.error && noteResult.data?.length) {
          const allFolderData = allFoldersResult.data ?? [];
          const parentMap: Record<string, { id: string; title: string; slug: string; parent_id: string | null }> = {};
          allFolderData.forEach((f: Record<string, unknown>) => {
            parentMap[f.id as string] = {
              id: f.id as string,
              title: f.title as string,
              slug: f.slug as string,
              parent_id: (f.parent_id as string | null) ?? null,
            };
          });

          const mappedNotes: NoteItem[] = (noteResult.data ?? []).map(
            (n: Record<string, unknown>) => {
              const owner = mapOwner(n.owner as { full_name?: string; avatar_url?: string | null; username?: string | null } | null, "Unknown");
              const folder = (n.folder as { id: string; title: string; slug: string; parent_id: string | null } | null) ?? {
                id: "", title: "Uncategorised", slug: "", parent_id: null,
              };
              const folderPath = buildFolderPath(
                folder.id, folder.title, folder.slug, parentMap,
              );
              return {
                id: n.id as string,
                title: n.title as string,
                description: (n.description as string | null) ?? null,
                slug: n.slug as string,
                updated_at: n.updated_at as string,
                owner_id: n.owner_id as string,
                owner_name: owner.name,
                owner_username: owner.username || "unknown",
                owner_avatar: owner.avatar,
                folder_id: folder.id,
                folder_title: folder.title,
                folder_slug: folder.slug,
                folder_path: folderPath,
              };
            },
          );

          if (mounted) {
            setNotes(mappedNotes);
            setNotesLoading(false);
          }
        } else if (mounted) {
          setNotesLoading(false);
        }
      } catch {
        if (mounted) {
          setFoldersLoading(false);
          setNotesLoading(false);
        }
      }
    };

    void load();
    return () => { mounted = false; };
  }, []);

  // ─── Render ──────────────────────────────────────────────

  return (
    <>
      <Navbar />

      {/* ================================================================
          HERO  (no stats)
          ================================================================ */}
      <section style={styles.hero}>
        <div style={styles.heroBg} />
        <div style={styles.heroContent}>
          <div style={styles.heroTag}>
            <span style={styles.heroTagDot} />
            Open knowledge sharing
          </div>
          <h1 style={styles.heroTitle}>
            Share What You Know Simply{" "}
            <span style={{ color: "var(--color-accent)" }}>with Confluence.</span>
          </h1>
          <p style={styles.heroSub}>
            Confluence is a structured, block-based note-sharing platform.
            Organise your knowledge, collaborate in real-time, and publish
            publicly or keep it private.
          </p>
          <div style={styles.heroCtas}>
            <Link to="/signup">
              <Button variant="primary" size="lg" style={{ fontSize: "1rem", padding: "0.8em 2em" }}>
                Get started free
              </Button>
            </Link>
            <Link to="/notes">
              <Button variant="secondary" size="lg" style={{ fontSize: "1rem", padding: "0.8em 2em" }}>
                Browse public notes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================
          FEATURES  — "Everything you need, nothing you don't"
          ================================================================ */}
      <section style={styles.featuresSection}>
        <div style={styles.sectionInner}>
          <h2 style={styles.centeredTitle}>Everything you need, nothing you don&apos;t</h2>
          <p style={styles.centeredSub}>Designed for developers, teachers, writers, and thinkers.</p>

          <div style={styles.featuresGrid}>
            {FEATURES.map((feature) => (
              <div key={feature.title} style={styles.featureCard}>
                <span style={styles.featureIcon}>{feature.icon}</span>
                <h3 style={styles.featureCardTitle}>{feature.title}</h3>
                <p style={styles.featureCardDesc}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          HOW IT WORKS  — 4 steps
          ================================================================ */}
      <section style={styles.howSection}>
        <div style={styles.sectionBorder} />
        <div style={styles.sectionInner}>
          <h2 style={styles.centeredTitle}>How it works</h2>
          <p style={styles.centeredSub}>Get started in four simple steps.</p>

          <div style={styles.howGrid}>
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} style={styles.howCard}>
                <span style={styles.howStepNum}>{item.step}</span>
                <h3 style={styles.howCardTitle}>{item.title}</h3>
                <p style={styles.howCardDesc}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          FEATURED FOLDERS  — with 📁 icon on cards
          ================================================================ */}
      <section style={styles.foldersSection}>
        <div style={styles.sectionBorder} />
        <div style={styles.sectionInner}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Featured folders</h2>
              <p style={styles.sectionSub}>Explore shared knowledge spaces from the community.</p>
            </div>
            <Link to="/folders">
              <Button variant="ghost" size="sm" rightIcon={<span>→</span>}>
                View all
              </Button>
            </Link>
          </div>

          <div style={styles.cardGrid}>
            {foldersLoading && folders === DUMMY_FOLDERS ? (
              <div style={styles.sectionLoader}>
                <div style={styles.loaderSpinner} />
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Loading folders...</span>
              </div>
            ) : (
              folders.slice(0, 3).map((folder) => (
                <Link
                  key={folder.id}
                  to={`/${folder.owner_username}/folder/${folder.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={styles.card} className="card-hover">
                    <span style={styles.folderIcon}>📁</span>
                    <div style={styles.cardBody}>
                      <h3 style={styles.cardTitle}>{folder.title}</h3>
                      {folder.description && (
                        <p style={styles.cardDesc}>{folder.description}</p>
                      )}
                      <div style={styles.cardMeta}>
                        <Badge variant="accent">📄 {folder.note_count} notes</Badge>
                      </div>
                    </div>
                    <div style={styles.cardFooter}>
                      <div style={styles.authorRow}>
                        <Avatar name={folder.owner_name} size={24} />
                        <span style={styles.authorName}>{folder.owner_name}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ================================================================
          LATEST NOTES  — full width cards (stacked list)
          ================================================================ */}
      <section style={styles.notesSection}>
        <div style={styles.sectionBorder} />
        <div style={styles.sectionInner}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Latest notes</h2>
              <p style={styles.sectionSub}>Recently published notes from the community.</p>
            </div>
            <Link to="/notes">
              <Button variant="ghost" size="sm" rightIcon={<span>→</span>}>
                View all
              </Button>
            </Link>
          </div>

          <div style={styles.notesList}>
            {notesLoading && notes === DUMMY_NOTES ? (
              <div style={styles.sectionLoader}>
                <div style={styles.loaderSpinner} />
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Loading notes...</span>
              </div>
            ) : (
              notes.slice(0, 6).map((note) => (
                <Link
                  key={note.id}
                  to={`/${note.owner_username}/n/${note.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={styles.noteCard} className="card-hover">
                    {/* Folder breadcrumb */}
                    {note.folder_path.length > 0 && (
                      <div style={styles.breadcrumb}>
                        <span style={{ marginRight: 4, fontSize: 12 }}>📂</span>
                        {note.folder_path.map((seg, i) => (
                          <span key={seg.slug} style={{ display: "inline-flex", alignItems: "center" }}>
                            {i > 0 && (
                              <span style={{ color: "var(--color-text-muted)", margin: "0 4px", fontSize: 11 }}>
                                ›
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: 11,
                                color: i === note.folder_path.length - 1
                                  ? "var(--color-accent)"
                                  : "var(--color-text-muted)",
                                fontWeight: i === note.folder_path.length - 1 ? 500 : 400,
                              }}
                            >
                              {seg.title}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}

                    <h3 style={styles.cardTitle}>{note.title}</h3>
                    {note.description && (
                      <p style={styles.cardDesc}>{note.description}</p>
                    )}

                    <div style={styles.cardFooter}>
                      <div style={styles.authorRow}>
                        <Avatar name={note.owner_name} size={22} />
                        <span style={styles.authorName}>{note.owner_name}</span>
                      </div>
                      <span style={styles.dateText}>{timeAgo(note.updated_at)}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ================================================================
          CTA BANNER  — dark background, lighter banner inset
          ================================================================ */}
      <section style={styles.ctaSection}>
        <div style={styles.ctaInner}>
          <h2 style={styles.ctaTitle}>Ready to share your knowledge?</h2>
          <p style={styles.ctaDesc}>
            Join the community. Create, organise, and share structured notes with
            the world.
          </p>
          <Link to="/signup">
            <Button
              variant="primary"
              size="lg"
              style={{
                fontSize: "1rem",
                padding: "0.8em 2.4em",
              }}
            >
              Get started — it&apos;s free
            </Button>
          </Link>
        </div>
      </section>

      <Footer />

      <style>{`
        .card-hover {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .card-hover:hover {
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

  // ── Hero ─────────────────────────────────────────────────
  hero: {
    position: "relative",
    minHeight: "70vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-16) var(--space-8)",
    overflow: "hidden",
  },
  heroBg: {
    position: "absolute",
    inset: 0,
    background: [
      "radial-gradient(ellipse 80% 60% at 50% 0%, var(--color-accent-subtle) 0%, transparent 60%)",
      "radial-gradient(ellipse 60% 50% at 80% 80%, rgba(13, 127, 102, 0.04) 0%, transparent 50%)",
      "radial-gradient(ellipse 50% 40% at 20% 70%, rgba(79, 70, 229, 0.03) 0%, transparent 50%)",
    ].join(","),
    pointerEvents: "none",
  },
  heroContent: {
    position: "relative",
    zIndex: 2,
    maxWidth: 1040,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-6)",
  },
  heroTitle: {
    fontSize: "clamp(2.8rem, 8vw, 5rem)",
    fontWeight: 700,
    letterSpacing: "var(--letter-spacing-tight)",
    lineHeight: 1.15,
    color: "var(--color-text-primary)",
    margin: 0,
  },
  heroSub: {
    fontSize: "var(--font-size-lg)",
    color: "var(--color-text-secondary)",
    lineHeight: 1.6,
    maxWidth: 540,
    margin: 0,
  },
  heroTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: "var(--font-size-xs)",
    fontWeight: 500,
    color: "var(--color-accent)",
    background: "var(--color-accent-subtle)",
    border: "1px solid var(--color-accent-muted)",
    borderRadius: "var(--radius-full)",
    padding: "4px 14px",
    fontFamily: "var(--font-sans)",
    letterSpacing: "var(--letter-spacing-wide)",
  },
  heroTagDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--color-accent)",
    display: "inline-block",
  },
  heroCtas: {
    display: "flex",
    gap: "var(--space-4)",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: "var(--space-2)",
  },

  // ── Shared ───────────────────────────────────────────────
  sectionInner: {
    maxWidth: 1280,
    margin: "0 auto",
  },
  sectionBorder: {
    maxWidth: 1280,
    margin: "0 auto",
    borderTop: "1px solid var(--color-border)",
    marginBottom: "var(--space-20)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "var(--space-8)",
    gap: "var(--space-4)",
  },
  sectionTitle: {
    fontSize: "var(--font-size-3xl)",
    fontWeight: 700,
    color: "var(--color-text-primary)",
    margin: 0,
  },
  sectionSub: {
    fontSize: "var(--font-size-base)",
    color: "var(--color-text-muted)",
    margin: "var(--space-1) 0 0",
  },

  // ── Centered headings ────────────────────────────────────
  centeredTitle: {
    fontSize: "var(--font-size-3xl)",
    fontWeight: 700,
    color: "var(--color-text-primary)",
    margin: 0,
    textAlign: "center",
  },
  centeredSub: {
    fontSize: "var(--font-size-base)",
    color: "var(--color-text-muted)",
    margin: "var(--space-1) 0 0",
    textAlign: "center",
  },

  // ── Features ─────────────────────────────────────────────
  featuresSection: {
    padding: "var(--space-20) var(--space-8)",
    textAlign: "center",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "var(--space-5)",
    marginTop: "var(--space-10)",
    textAlign: "left",
  },
  featureCard: {
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-xl)",
    padding: "var(--space-6)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  featureIcon: {
    fontSize: 28,
    display: "block",
    marginBottom: "var(--space-3)",
    lineHeight: 1,
  },
  featureCardTitle: {
    fontSize: "var(--font-size-md)",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: "0 0 var(--space-2)",
  },
  featureCardDesc: {
    fontSize: "var(--font-size-sm)",
    color: "var(--color-text-secondary)",
    margin: 0,
    lineHeight: 1.6,
  },

  // ── How it works ─────────────────────────────────────────
  howSection: {
    padding: "var(--space-20) var(--space-8)",
    textAlign: "center",
  },
  howGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "var(--space-6)",
    marginTop: "var(--space-10)",
  },
  howCard: {
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-xl)",
    padding: "var(--space-10) var(--space-8)",
    textAlign: "center",
    position: "relative",
  },
  howStepNum: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "var(--color-accent-subtle)",
    color: "var(--color-accent)",
    fontSize: "var(--font-size-sm)",
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    marginBottom: "var(--space-4)",
  },
  howCardTitle: {
    fontSize: "var(--font-size-md)",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: "0 0 var(--space-2)",
  },
  howCardDesc: {
    fontSize: "var(--font-size-sm)",
    color: "var(--color-text-secondary)",
    margin: 0,
    lineHeight: 1.6,
  },

  // ── Section loader ──────────────────────────────────────
  sectionLoader: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-16) 0',
    minHeight: 200,
  },

  // ── Folders ──────────────────────────────────────────────
  foldersSection: {
    padding: "var(--space-20) var(--space-8)",
  },
  folderIcon: {
    fontSize: 28,
    display: "block",
    marginBottom: "var(--space-3)",
    lineHeight: 1,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
    gap: "var(--space-4)",
  },
  card: {
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-xl)",
    padding: "var(--space-6)",
    boxShadow: "var(--shadow-xs)",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  cardBody: {
    flex: 1,
    minHeight: 0,
  },
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
  cardMeta: {
    marginTop: "var(--space-3)",
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "var(--space-4)",
    paddingTop: "var(--space-3)",
    borderTop: "1px solid var(--color-border-subtle)",
  },
  authorRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
  },
  authorName: {
    fontSize: "var(--font-size-xs)",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    fontFamily: "var(--font-sans)",
  },
  dateText: {
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-muted)",
    fontFamily: "var(--font-mono)",
  },
  breadcrumb: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "var(--space-3)",
  },

  // ── Notes (full width list) ──────────────────────────────
  notesSection: {
    padding: "var(--space-20) var(--space-8)",
  },
  notesList: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
  },
  noteCard: {
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-xl)",
    padding: "var(--space-5) var(--space-6)",
    boxShadow: "var(--shadow-xs)",
    width: "100%",
  },

  // ── CTA banner ──────────────────────────────────────────
  ctaSection: {
    padding: "var(--space-20) var(--space-8)",
    textAlign: "center",
  },
  ctaInner: {
    maxWidth: 1280,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-6)",
    background: "var(--color-bg-elevated)",
    borderRadius: "var(--radius-2xl)",
    padding: "var(--space-16) var(--space-10)",
    boxShadow: "var(--shadow-sm)",
  },
  ctaTitle: {
    fontSize: "var(--font-size-3xl)",
    fontWeight: 700,
    color: "var(--color-text-primary)",
    margin: 0,
  },
  ctaDesc: {
    fontSize: "var(--font-size-base)",
    color: "var(--color-text-secondary)",
    margin: 0,
    lineHeight: 1.6,
  },
};
