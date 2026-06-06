import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: "var(--space-3)",
        fontSize: "var(--font-size-xs)",
        color: "var(--color-text-muted)",
      }}
    >
      <span>
        Page {currentPage} of {totalPages} ({totalItems} total)
      </span>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{
            padding: "4px 10px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            background: currentPage <= 1 ? "var(--color-bg-muted)" : "var(--color-bg-elevated)",
            color: currentPage <= 1 ? "var(--color-text-muted)" : "var(--color-text-primary)",
            cursor: currentPage <= 1 ? "default" : "pointer",
            fontSize: "11px",
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
          }}
        >
          ← Prev
        </button>
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{
            padding: "4px 10px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            background: currentPage >= totalPages ? "var(--color-bg-muted)" : "var(--color-bg-elevated)",
            color: currentPage >= totalPages ? "var(--color-text-muted)" : "var(--color-text-primary)",
            cursor: currentPage >= totalPages ? "default" : "pointer",
            fontSize: "11px",
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
          }}
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
      <div
        style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          boxShadow: "var(--shadow-xs)",
          transition: "all 0.15s ease",
          cursor: "pointer",
        }}
        className="stat-card-hover"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
            }}
          >
            {label}
          </span>
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-accent-subtle)",
              border: "1px solid var(--color-accent-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-accent)",
            }}
          >
            <Icon d={icon} size={15} />
          </div>
        </div>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "var(--font-size-3xl)",
              fontWeight: "var(--font-weight-bold)",
              letterSpacing: "var(--letter-spacing-tight)",
              color: "var(--color-text-primary)",
            }}
          >
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
  });

  // All data for pagination
  const [allNotes, setAllNotes] = useState<
    { id: string; title: string; visibility: string; updated_at: string; folder_id: string; folder: any }[]
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
        const { data: notes } = await supabase
          .from("notes")
          .select("id, title, visibility, updated_at, folder_id, folder:folders(id, title, slug)")
          .eq("owner_id", user.id);

        const allFolders = folders || [];
        const allNotes = notes || [];

        const rootF = allFolders.filter((f) => f.parent_id === null);
        const subF = allFolders.filter((f) => f.parent_id !== null);
        const pubN = allNotes.filter((n) => n.visibility === "public");

        setStats({
          rootFolders: rootF.length,
          subfolders: subF.length,
          notes: allNotes.length,
          publicNotes: pubN.length,
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
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
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
        <div
          style={{
            padding: "var(--space-20)",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-6)",
        }}
      >
        <StatCard label="Folders" value={stats.rootFolders} icon={IC.folder} href="/dashboard/folders" />
        <StatCard label="Subfolders" value={stats.subfolders} icon={IC.subfolder} href="/dashboard/subfolders" />
        <StatCard label="Notes" value={stats.notes} icon={IC.notes} href="/dashboard/notes" />
        <StatCard label="Public" value={stats.publicNotes} icon={IC.globe} href="/dashboard/notes" />
      </div>

      {/* Ready to create something */}
      <div
        style={{
          marginBottom: "var(--space-8)",
          padding: "var(--space-6)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <h4
            style={{
              margin: 0,
              marginBottom: "var(--space-1)",
              color: "var(--color-text-primary)",
              fontSize: "var(--font-size-md)",
            }}
          >
            Ready to create something?
          </h4>
          <p
            style={{
              margin: 0,
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-muted)",
            }}
          >
            Start with a folder, subfolder, then add notes inside.
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "var(--space-6)",
        }}
        className="dash-grid-3"
      >
        {/* ── Recent Notes ── */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--space-4)",
            }}
          >
            <h3
              style={{
                fontSize: "var(--font-size-md)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-primary)",
                margin: 0,
              }}
            >
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "var(--space-3) var(--space-4)",
                      background: "var(--color-bg-elevated)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-lg)",
                      gap: "var(--space-3)",
                      transition: "all 0.15s ease",
                    }}
                    className="list-item-hover"
                  >
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
              <div
                style={{
                  padding: "var(--space-6)",
                  textAlign: "center",
                  border: "1px dashed var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--space-4)",
            }}
          >
            <h3
              style={{
                fontSize: "var(--font-size-md)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-primary)",
                margin: 0,
              }}
            >
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      padding: "var(--space-3) var(--space-4)",
                      background: "var(--color-bg-elevated)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-lg)",
                      transition: "all 0.15s ease",
                    }}
                    className="list-item-hover"
                  >
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
              <div
                style={{
                  padding: "var(--space-6)",
                  textAlign: "center",
                  border: "1px dashed var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--space-4)",
            }}
          >
            <h3
              style={{
                fontSize: "var(--font-size-md)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-primary)",
                margin: 0,
              }}
            >
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      padding: "var(--space-3) var(--space-4)",
                      background: "var(--color-bg-elevated)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-lg)",
                      transition: "all 0.15s ease",
                    }}
                    className="list-item-hover"
                  >
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
              <div
                style={{
                  padding: "var(--space-6)",
                  textAlign: "center",
                  border: "1px dashed var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
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

      <style>{`
        @media (max-width: 1024px) {
          .dash-grid-3 { grid-template-columns: 1fr; }
        }
        .stat-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md) !important;
          border-color: var(--color-accent-muted) !important;
        }
        .list-item-hover:hover {
          border-color: var(--color-accent-muted) !important;
          background: var(--color-bg-subtle) !important;
        }
      `}</style>
    </DashboardLayout>
  );
}
