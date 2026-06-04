import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";

function StatCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
}: {
  label: string;
  value: string | number;
  icon: string;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
}) {
  const trendColor =
    trend === "up"
      ? "var(--color-success)"
      : trend === "down"
        ? "var(--color-danger)"
        : "var(--color-text-muted)";
  const trendBg =
    trend === "up"
      ? "var(--color-success-subtle)"
      : trend === "down"
        ? "var(--color-danger-subtle)"
        : "var(--color-bg-muted)";
  return (
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
      }}
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
        {trendLabel && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              marginTop: "var(--space-1)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
              color: trendColor,
              background: trendBg,
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
            }}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [recentFolders, setRecentFolders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const supabase = requireSupabase();

        // 1. Fetch folders
        const { data: folders } = await supabase
          .from("folders")
          .select(
            "id, parent_id, title, visibility, updated_at, description, slug",
          )
          .eq("owner_id", user.id);

        // 2. Fetch notes
        const { data: notes } = await supabase
          .from("notes")
          .select(
            "id, title, visibility, updated_at, folder_id, folder:folders(id, title, slug)",
          )
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

        // Compute subfolders and notes counts per root folder
        const computedFolders = rootF.map((rf) => {
          const subCount = allFolders.filter(
            (f) => f.parent_id === rf.id,
          ).length;
          const noteCount = allNotes.filter(
            (n) => n.folder_id === rf.id,
          ).length;
          return {
            ...rf,
            subfoldersCount: subCount,
            noteCount: noteCount,
          };
        });

        // Sort and slice recent items
        const sortedNotes = [...allNotes]
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
          .slice(0, 5);

        const sortedFolders = [...computedFolders]
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
          .slice(0, 4);

        setRecentNotes(sortedNotes);
        setRecentFolders(sortedFolders);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [user]);

  if (!user || loading) {
    return (
      <DashboardLayout
        user={
          user || {
            id: "",
            full_name: "Loading...",
            avatar_url: null,
            user_type: "user",
            created_at: "",
          }
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

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-8)",
        }}
      >
        <StatCard
          label="Folders"
          value={stats.rootFolders}
          icon={IC.folder}
          trend="up"
          trendLabel="Updated"
        />
        <StatCard
          label="Subfolders"
          value={stats.subfolders}
          icon={IC.subfolder}
          trend="up"
          trendLabel="Updated"
        />
        <StatCard
          label="Notes"
          value={stats.notes}
          icon={IC.notes}
          trend="up"
          trendLabel="Updated"
        />
        <StatCard
          label="Public"
          value={stats.publicNotes}
          icon={IC.globe}
          trend="flat"
          trendLabel="No change"
        />
      </div>

      {/* Two-column lower */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-6)",
        }}
        className="dash-grid"
      >
        {/* Recent notes */}
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
            {recentNotes.length > 0 ? (
              recentNotes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    gap: "var(--space-3)",
                  }}
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
                  <Badge
                    variant={note.visibility === "public" ? "accent" : "muted"}
                  >
                    {note.visibility}
                  </Badge>
                </div>
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
        </div>

        {/* Recent folders */}
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
              Your folders
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
            {recentFolders.length > 0 ? (
              recentFolders.map((folder) => (
                <div
                  key={folder.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    gap: "var(--space-3)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{ color: "var(--color-accent)", flexShrink: 0 }}
                    >
                      <Icon d={IC.folder} size={15} />
                    </span>
                    <div style={{ minWidth: 0 }}>
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
                        {folder.subfoldersCount} subfolders · {folder.noteCount}{" "}
                        notes
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      folder.visibility === "public" ? "accent" : "muted"
                    }
                  >
                    {folder.visibility}
                  </Badge>
                </div>
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
        </div>
      </div>

      {/* Quick actions */}
      <div
        style={{
          marginTop: "var(--space-8)",
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
            Start with a folder, then add notes inside.
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Link to="/dashboard/folders">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Icon d={IC.folder} size={14} />}
            >
              New folder
            </Button>
          </Link>
          <Link to="/dashboard/notes/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Icon d={IC.plus} size={14} />}
            >
              New note
            </Button>
          </Link>
        </div>
      </div>

      <style>{`.dash-grid { @media (max-width: 768px) { grid-template-columns: 1fr; } }`}</style>
    </DashboardLayout>
  );
}
