import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge, Button, EmptyState } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────

interface ProfileData {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  user_type: string;
  created_at: string;
}

interface PublicFolder {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  parent_id: string | null;
  note_count: number;
  created_at: string;
}

interface PublicNote {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  folder_id: string;
  folder_slug: string;
  folder_title: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "#0D7F66", "#B87009", "#4F46E5", "#BE185D",
  "#059669", "#D97706", "#7C3AED", "#DB2777",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ name, size = 64 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: getAvatarColor(name),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: size * 0.4,
        fontWeight: 700,
        fontFamily: "var(--font-sans)",
        flexShrink: 0,
        lineHeight: 1,
      }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}

const FOLDER_EMOJIS = ["💻", "🏗️", "🚀", "🎨", "⚙️", "🗄️"];

function getFolderEmoji(index: number): string {
  return FOLDER_EMOJIS[index % FOLDER_EMOJIS.length];
}

// ─── UserProfilePage ──────────────────────────────────────────

export function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [folders, setFolders] = useState<PublicFolder[]>([]);
  const [notes, setNotes] = useState<PublicNote[]>([]);
  const [subfolderCount, setSubfolderCount] = useState(0);

  useEffect(() => {
    if (!username) return;

    const load = async () => {
      try {
        const supabase = requireSupabase();

        // 1. Find profile by username
        const { data: profileData, error: profileErr } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, user_type, created_at")
          .eq("username", username)
          .single();

        if (profileErr || !profileData) {
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // 2. Fetch public folders owned by this user
        const { data: folderData } = await supabase
          .from("folders")
          .select("id, title, description, slug, parent_id, created_at")
          .eq("owner_id", profileData.id)
          .eq("visibility", "public")
          .order("title", { ascending: true });

        const allFolders = (folderData || []) as PublicFolder[];
        const roots = allFolders.filter((f) => !f.parent_id);
        const subs = allFolders.filter((f) => f.parent_id);

        setSubfolderCount(subs.length);

        // 3. Fetch public notes owned by this user
        const { data: noteData } = await supabase
          .from("notes")
          .select(
            "id, title, description, slug, folder_id, updated_at, folder:folders!folder_id(id, title, slug)",
          )
          .eq("owner_id", profileData.id)
          .eq("visibility", "public")
          .order("updated_at", { ascending: false })
          .limit(20);

        // 4. Count notes per folder
        const noteCounts: Record<string, number> = {};
        (noteData || []).forEach((n: Record<string, unknown>) => {
          const fid = n.folder_id as string;
          noteCounts[fid] = (noteCounts[fid] || 0) + 1;
        });

        // Build root folders with note_count
        const mappedRoots: PublicFolder[] = roots.map((f) => ({
          ...f,
          note_count: noteCounts[f.id] || 0,
        }));

        setFolders(mappedRoots);

        // Map notes with folder info
        const mappedNotes: PublicNote[] = (noteData || []).map(
          (n: Record<string, unknown>) => {
            const folder = n.folder as { id: string; title: string; slug: string } | null;
            return {
              id: n.id as string,
              title: n.title as string,
              description: (n.description as string | null) ?? null,
              slug: n.slug as string,
              folder_id: n.folder_id as string,
              folder_slug: folder?.slug || "",
              folder_title: folder?.title || "Uncategorised",
              updated_at: n.updated_at as string,
            };
          },
        );

        setNotes(mappedNotes);
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [username]);

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

  if (!profile) {
    return (
      <>
        <Navbar />
        <EmptyState
          icon="👤"
          title="User not found"
          description="No user exists with this username."
          action={
            <Link to="/">
              <Button variant="primary" size="sm">Go home</Button>
            </Link>
          }
        />
        <Footer />
      </>
    );
  }

  const joinedDate = formatDate(profile.created_at);
  const totalNotes = notes.length;
  const totalFolders = folders.length;

  return (
    <>
      <Navbar />

      <div style={styles.page}>
        {/* ─── Profile Header ─── */}
        <div style={styles.profileHeader}>
          <Avatar name={profile.full_name} size={80} />
          <div style={styles.profileInfo}>
            <h1 style={styles.profileName}>{profile.full_name}</h1>
            <p style={styles.profileUsername}>@{profile.username}</p>
            <div style={styles.profileMeta}>
              <span style={styles.metaItem}>
                <span style={styles.metaIcon}>📅</span>
                Joined {joinedDate}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Stats ─── */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{totalFolders}</span>
            <span style={styles.statLabel}>
              Folder{totalFolders !== 1 ? "s" : ""}
            </span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{subfolderCount}</span>
            <span style={styles.statLabel}>Subfolder{subfolderCount !== 1 ? "s" : ""}</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{totalNotes}</span>
            <span style={styles.statLabel}>
              Note{totalNotes !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ─── Public Folders ─── */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Public folders</h2>
            <span style={styles.sectionCount}>
              {totalFolders} folder{totalFolders !== 1 ? "s" : ""}
            </span>
          </div>

          {folders.length > 0 ? (
            <div style={styles.cardGrid}>
              {folders.map((folder, i) => (
                <Link
                  key={folder.id}
                  to={`/${profile.username}/folder/${folder.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={styles.card} className="profile-card-hover">
                    <span style={styles.cardEmoji}>{getFolderEmoji(i)}</span>
                    <h3 style={styles.cardTitle}>{folder.title}</h3>
                    {folder.description && (
                      <p style={styles.cardDesc}>{folder.description}</p>
                    )}
                    <Badge variant="accent" style={{ alignSelf: "flex-start" }}>
                      📄 {folder.note_count} note{folder.note_count !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={styles.emptySection}>
              <p>No public folders yet.</p>
            </div>
          )}
        </section>

        {/* ─── Public Notes ─── */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Public notes</h2>
            <span style={styles.sectionCount}>
              {totalNotes} note{totalNotes !== 1 ? "s" : ""}
            </span>
          </div>

          {notes.length > 0 ? (
            <div style={styles.notesList}>
              {notes.map((note) => (
                <Link
                  key={note.id}
                  to={`/${profile.username}/n/${note.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={styles.noteCard} className="profile-card-hover">
                    <div style={styles.noteCardBody}>
                      {/* Folder badge */}
                      {note.folder_slug && (
                        <div
                          style={styles.noteFolder}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/${profile.username}/folder/${note.folder_slug}`);
                          }}
                        >
                          📂 {note.folder_title}
                        </div>
                      )}

                      <h3 style={styles.noteCardTitle}>{note.title}</h3>
                      {note.description && (
                        <p style={styles.noteCardDesc}>{note.description}</p>
                      )}
                    </div>
                    <span style={styles.noteDate}>
                      {timeAgo(note.updated_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={styles.emptySection}>
              <p>No public notes yet.</p>
            </div>
          )}
        </section>
      </div>

      <Footer />

      <style>{`
        .profile-card-hover {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .profile-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md) !important;
          border-color: var(--color-accent-muted) !important;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
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
    maxWidth: 1040,
    margin: "0 auto",
    padding: "var(--space-16) var(--space-8)",
    minHeight: "90vh",
  },

  // ── Profile header ──
  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-6)",
    marginBottom: "var(--space-8)",
    paddingBottom: "var(--space-8)",
    borderBottom: "1px solid var(--color-border)",
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: "var(--font-size-3xl)",
    fontWeight: 700,
    color: "var(--color-text-primary)",
    margin: "0 0 var(--space-1)",
    lineHeight: 1.2,
  },
  profileUsername: {
    fontSize: "var(--font-size-md)",
    color: "var(--color-text-muted)",
    margin: "0 0 var(--space-3)",
    fontFamily: "var(--font-mono)",
  },
  profileMeta: {
    display: "flex",
    gap: "var(--space-4)",
    flexWrap: "wrap",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-1)",
    fontSize: "var(--font-size-sm)",
    color: "var(--color-text-secondary)",
  },
  metaIcon: {
    fontSize: 14,
    lineHeight: 1,
  },

  // ── Stats ──
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "var(--space-4)",
    marginBottom: "var(--space-10)",
  },
  statCard: {
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-xl)",
    padding: "var(--space-5)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-2)",
    textAlign: "center",
  },
  statValue: {
    fontSize: "var(--font-size-3xl)",
    fontWeight: 700,
    color: "var(--color-text-primary)",
    lineHeight: 1,
  },
  statLabel: {
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 500,
  },

  // ── Sections ──
  section: {
    marginBottom: "var(--space-10)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: "var(--space-6)",
    gap: "var(--space-4)",
  },
  sectionTitle: {
    fontSize: "var(--font-size-2xl)",
    fontWeight: 700,
    color: "var(--color-text-primary)",
    margin: 0,
  },
  sectionCount: {
    fontSize: "var(--font-size-sm)",
    color: "var(--color-text-muted)",
  },
  emptySection: {
    padding: "var(--space-10)",
    textAlign: "center",
    border: "1px dashed var(--color-border)",
    borderRadius: "var(--radius-xl)",
    color: "var(--color-text-muted)",
    fontSize: "var(--font-size-sm)",
  },

  // ── Folder cards ──
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
    gap: "var(--space-4)",
  },
  card: {
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-xl)",
    padding: "var(--space-6)",
    boxShadow: "var(--shadow-xs)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
    height: "100%",
  },
  cardEmoji: {
    fontSize: 28,
    lineHeight: 1,
  },
  cardTitle: {
    fontSize: "var(--font-size-md)",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: 0,
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
    flex: 1,
  },

  // ── Note list ──
  notesList: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
  },
  noteCard: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "var(--space-4)",
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-xl)",
    padding: "var(--space-5) var(--space-6)",
    boxShadow: "var(--shadow-xs)",
  },
  noteCardBody: {
    flex: 1,
    minWidth: 0,
  },
  noteFolder: {
    fontSize: 11,
    color: "var(--color-accent)",
    fontWeight: 500,
    marginBottom: "var(--space-2)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  noteCardTitle: {
    fontSize: "var(--font-size-md)",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: "0 0 var(--space-1)",
    lineHeight: 1.3,
  },
  noteCardDesc: {
    fontSize: "var(--font-size-sm)",
    color: "var(--color-text-secondary)",
    margin: 0,
    lineHeight: 1.55,
    display: "-webkit-box",
    WebkitLineClamp: 1,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  noteDate: {
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-muted)",
    flexShrink: 0,
    fontFamily: "var(--font-mono)",
    marginTop: "2px",
  },
};
