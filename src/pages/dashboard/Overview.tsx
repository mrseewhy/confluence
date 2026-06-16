import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import styles from "@/styles/dashboard.module.css";
import { formatDate } from "@/lib/helpers";

const PAGE_SIZE = 10;

// (formatDate imported from @/lib/helpers)

// ─── Pagination Component ─────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className={styles.paginationRow} style={{ marginTop: "var(--space-3)" }}>
      <span className={styles.paginationInfo}>
        Page {currentPage} of {totalPages} ({totalItems} total)
      </span>
      <div className={styles.paginationBtnGroup}>
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={styles.paginationBtn}
          aria-label="Previous page"
        >
          ← Prev
        </button>
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={styles.paginationBtn}
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Stats Card ───────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: string;
  href: string;
}) {
  return (
    <Link to={href} style={{ textDecoration: "none" }}>
      <div className={styles.statCard}>
        <div className={styles.statCardTop}>
          <span className={styles.statLabel}>
            {label}
          </span>
          <div className={styles.statIconWrap}>
            <Icon d={icon} size={15} />
          </div>
        </div>
        <div>
          <p className={styles.statValue}>
            {value}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ─── Overview Component ───────────────────────────────────────

export function DashboardOverview() {
  const { profile } = useAuth();
  const user = profile;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    rootFolders: 0,
    subfolders: 0,
    notes: 0,
    publicNotes: 0,
    collaborators: 0,
    collaborations: 0,
  });

  // All data for pagination
  const [allNotes, setAllNotes] = useState<
    { id: string; title: string; visibility: string; updated_at: string; folder_id: string; folder: { id: string; title: string; slug: string } | null }[]
  >([]);
  const [allSubfolders, setAllSubfolders] = useState<
    { id: string; parent_id: string; title: string; description: string | null; slug: string; visibility: string; updated_at: string; noteCount: number }[]
  >([]);
  const [allFolders, setAllFolders] = useState<
    { id: string; parent_id: string | null; title: string; description: string | null; slug: string; visibility: string; updated_at: string; subfoldersCount: number; noteCount: number }[]
  >([]);

  // Pagination state
  const [notesPage, setNotesPage] = useState(1);
  const [subfoldersPage, setSubfoldersPage] = useState(1);
  const [foldersPage, setFoldersPage] = useState(1);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const supabase = requireSupabase();

        // Fetch all folders for this user
        const { data: folders } = await supabase
          .from("folders")
          .select("id, parent_id, title, visibility, updated_at, description, slug")
          .eq("owner_id", user.id);

        // Fetch all notes for this user
        const { data: notesRaw } = await supabase
          .from("notes")
          .select("id, title, visibility, updated_at, folder_id, folder:folders(id, title, slug)")
          .eq("owner_id", user.id);

        // Supabase returns joined fields as arrays; convert folder from array to single object
        const notes = (notesRaw || []).map((n) => ({
          ...n,
          folder: Array.isArray(n.folder) && n.folder.length > 0
            ? n.folder[0]
            : null,
        }));

        const allFolders = folders || [];
        const allNotes = notes || [];

        const rootF = allFolders.filter((f) => f.parent_id === null);
        const subF = allFolders.filter((f) => f.parent_id !== null);
        const pubN = allNotes.filter((n) => n.visibility === "public");

        // Fetch collaborator counts
        const { count: cCount } = await supabase
          .from("collaborators")
          .select("*", { count: "exact", head: true })
          .eq("inviter_id", user.id);

        const { data: authData } = await supabase.auth.getUser();
        let collabCount = 0;
        if (authData?.user?.email) {
          const { count: sCount } = await supabase
            .from("collaborators")
            .select("*", { count: "exact", head: true })
            .eq("invitee_email", authData.user.email);
          collabCount = sCount ?? 0;
        }

        setStats({
          rootFolders: rootF.length,
          subfolders: subF.length,
          notes: allNotes.length,
          publicNotes: pubN.length,
          collaborators: cCount ?? 0,
          collaborations: collabCount,
        });

        // Compute subfolder and note counts per root folder
        const computedFolders = rootF.map((rf) => {
          const subCount = allFolders.filter((f) => f.parent_id === rf.id).length;
          const noteCount = allNotes.filter((n) => n.folder_id === rf.id).length;
          return { ...rf, subfoldersCount: subCount, noteCount };
        });

        // Compute note counts per subfolder
        const computedSubfolders = subF.map((sf) => {
          const noteCount = allNotes.filter((n) => n.folder_id === sf.id).length;
          return { ...sf, noteCount };
        });

        // Sort by updated_at descending
        const sortByDate = (
          a: { updated_at: string },
          b: { updated_at: string },
        ) => b.updated_at.localeCompare(a.updated_at);

        setAllNotes([...allNotes].sort(sortByDate));
        setAllSubfolders([...computedSubfolders].sort(sortByDate));
        setAllFolders([...computedFolders].sort(sortByDate));
      } catch {
        // Error fetching dashboard stats — shown via empty state below
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [user]);

  // Paginate
  const paginate = <T,>(items: T[], page: number) => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  };

  // ─── Render Logic ─────────────────────────────────────────

  if (!user || loading) {
    return (
      <DashboardLayout
        user={
          user || fallbackProfile()
        }
        variant="user"
      >
        <div className={styles.loadingState}>
          Loading workspace summary…
        </div>
      </DashboardLayout>
    );
  }

  const notesTotalPages = Math.max(1, Math.ceil(allNotes.length / PAGE_SIZE));
  const subfoldersTotalPages = Math.max(1, Math.ceil(allSubfolders.length / PAGE_SIZE));
  const foldersTotalPages = Math.max(1, Math.ceil(allFolders.length / PAGE_SIZE));

  return (
    <DashboardLayout user={user} variant="user">
      {/* Page header */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-bold)",
            letterSpacing: "var(--letter-spacing-tight)",
            color: "var(--color-text-primary)",
            marginBottom: "var(--space-1)",
          }}
        >
          Good morning, {user.full_name.split(" ")[0]} 👋
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          Here's a summary of your workspace.
        </p>
      </div>

      {/* Stats cards — clickable */}
      <div className={styles.statsGrid}>
        <StatCard label="Folders" value={stats.rootFolders} icon={IC.folder} href="/dashboard/folders" />
        <StatCard label="Nested" value={stats.subfolders} icon={IC.subfolder} href="/dashboard/subfolders" />
        <StatCard label="Notes" value={stats.notes} icon={IC.notes} href="/dashboard/notes" />
        <StatCard label="Public" value={stats.publicNotes} icon={IC.globe} href="/dashboard/notes" />
        <StatCard label="Collaborators" value={stats.collaborators} icon={IC.users} href="/dashboard/collaborators" />
        <StatCard label="Collaborations" value={stats.collaborations} icon={IC.share} href="/dashboard/collaborations" />
      </div>

      {/* Ready to create something */}
      <div className={styles.createBanner}>
        <div>
          <h4 className={styles.sectionTitle} style={{ marginBottom: "var(--space-1)" }}>
            Ready to create something?
          </h4>
          <p className={styles.headerSubtitle}>
            Start with a folder, then add notes and nested folders inside.
          </p>
        </div>
        <div className={styles.createBannerCta}>
          <Link to="/dashboard/folders">
            <Button variant="secondary" size="sm" leftIcon={<Icon d={IC.folder} size={14} />}>
              New folder
            </Button>
          </Link>
          <Link to="/dashboard/subfolders">
            <Button variant="secondary" size="sm" leftIcon={<Icon d={IC.subfolder} size={14} />}>
              New subfolder
            </Button>
          </Link>
          <Link to="/dashboard/notes/new">
            <Button variant="primary" size="sm" leftIcon={<Icon d={IC.plus} size={14} />}>
              New note
            </Button>
          </Link>
        </div>
      </div>

      {/* Three-column sections */}
      <div className={styles.grid3Col}>
        {/* ── Recent Notes ── */}
        <div>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Recent notes
            </h3>
            <Link to="/dashboard/notes">
              <Button variant="ghost" size="xs">
                View all →
              </Button>
            </Link>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            {allNotes.length > 0 ? (
              paginate(allNotes, notesPage).map((note) => (
                <Link
                  key={note.id}
                  to={`/dashboard/notes`}
                  style={{ textDecoration: "none" }}
                >
                  <div className={styles.listItemRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "var(--font-size-sm)",
                          fontWeight: "var(--font-weight-medium)",
                          color: "var(--color-text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {note.title}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {formatDate(note.updated_at)}
                      </p>
                    </div>
                    <Badge variant={note.visibility === "public" ? "accent" : "muted"}>
                      {note.visibility}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className={styles.emptyDash}>
                No notes created yet.
              </div>
            )}
          </div>
          <Pagination
            currentPage={notesPage}
            totalPages={notesTotalPages}
            totalItems={allNotes.length}
            onPageChange={setNotesPage}
          />
        </div>

        {/* ── Your Subfolders ── */}
        <div>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Your Subfolders
            </h3>
            <Link to="/dashboard/subfolders">
              <Button variant="ghost" size="xs">
                View all →
              </Button>
            </Link>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            {allSubfolders.length > 0 ? (
              paginate(allSubfolders, subfoldersPage).map((sub) => (
                <Link
                  key={sub.id}
                  to={`/dashboard/subfolders`}
                  style={{ textDecoration: "none" }}
                >
                  <div className={styles.listItem}>
                    <span style={{ color: "var(--color-accent)", flexShrink: 0 }}>
                      <Icon d={IC.subfolder} size={15} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "var(--font-size-sm)",
                          fontWeight: "var(--font-weight-medium)",
                          color: "var(--color-text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {sub.title}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {sub.noteCount} notes · {formatDate(sub.updated_at)}
                      </p>
                    </div>
                    <Badge variant={sub.visibility === "public" ? "accent" : "muted"}>
                      {sub.visibility}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className={styles.emptyDash}>
                No subfolders yet.
              </div>
            )}
          </div>
          <Pagination
            currentPage={subfoldersPage}
            totalPages={subfoldersTotalPages}
            totalItems={allSubfolders.length}
            onPageChange={setSubfoldersPage}
          />
        </div>

        {/* ── Your Folders ── */}
        <div>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Your Folders
            </h3>
            <Link to="/dashboard/folders">
              <Button variant="ghost" size="xs">
                View all →
              </Button>
            </Link>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            {allFolders.length > 0 ? (
              paginate(allFolders, foldersPage).map((folder) => (
                <Link
                  key={folder.id}
                  to={`/dashboard/folders`}
                  style={{ textDecoration: "none" }}
                >
                  <div className={styles.listItem}>
                    <span style={{ color: "var(--color-accent)", flexShrink: 0 }}>
                      <Icon d={IC.folder} size={15} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "var(--font-size-sm)",
                          fontWeight: "var(--font-weight-medium)",
                          color: "var(--color-text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {folder.title}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {folder.subfoldersCount} subfolders · {folder.noteCount} notes ·{" "}
                        {formatDate(folder.updated_at)}
                      </p>
                    </div>
                    <Badge variant={folder.visibility === "public" ? "accent" : "muted"}>
                      {folder.visibility}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className={styles.emptyDash}>
                No folders created yet.
              </div>
            )}
          </div>
          <Pagination
            currentPage={foldersPage}
            totalPages={foldersTotalPages}
            totalItems={allFolders.length}
            onPageChange={setFoldersPage}
          />
        </div>
      </div>

    </DashboardLayout>
  );
}
