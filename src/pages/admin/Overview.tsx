import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { formatDate } from "@/lib/helpers";
import type { Profile } from "@/types";

function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-5)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-4)",
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
            background: "var(--color-warning-subtle)",
            border: "1px solid var(--color-warning)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-warning)",
          }}
        >
          <Icon d={icon} size={15} />
        </div>
      </div>
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
      {sub && (
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
            marginTop: "var(--space-1)",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// (formatDate imported from @/lib/helpers)

interface NoteItem {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  updated_at: string;
  folder: { id: string; title: string; slug: string } | null;
}

export function AdminOverview() {
  const { profile } = useAuth();
  const user = profile;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    folders: 0,
    subfolders: 0,
    notes: 0,
    publicNotes: 0,
    collaborators: 0,
    collaborations: 0,
  });
  const [recentUsers, setRecentUsers] = useState<
    Pick<Profile, "id" | "full_name" | "avatar_url" | "user_type" | "created_at">[]
  >([]);
  const [recentNotes, setRecentNotes] = useState<
    Array<NoteItem>
  >([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = requireSupabase();

        // Users count
        const { count: usersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Users list
        const { data: users } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, user_type, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        // All folders
        const { data: folders } = await supabase
          .from("folders")
          .select(
            "id, parent_id, title, description, visibility, updated_at",
          );

        // All notes
        const { data: notesRaw } = await supabase
          .from("notes")
          .select(
            "id, title, description, visibility, updated_at, folder:folders(id, title, slug)",
          )
          .order("updated_at", { ascending: false })
          .limit(5);

        // Supabase returns joined fields as arrays; convert folder from array to single object
        const notes = (notesRaw || []).map((n) => ({
          ...n,
          folder: Array.isArray(n.folder) && n.folder.length > 0
            ? n.folder[0]
            : null,
        }));

        const allFolders = folders || [];
        const rootF = allFolders.filter((f) => !f.parent_id);
        const subF = allFolders.filter((f) => f.parent_id);
        const pubN = notes.filter((n) => n.visibility === "public");

        // Platform-wide collaborator stats
        const { count: collabCount } = await supabase
          .from("collaborators")
          .select("*", { count: "exact", head: true });

        // Activity log entries (proxy for collaboration actions)
        const { count: activityCount } = await supabase
          .from("activity_log")
          .select("*", { count: "exact", head: true });

        setStats({
          users: usersCount || 0,
          folders: rootF.length,
          subfolders: subF.length,
          notes: notes?.length || 0,
          publicNotes: pubN.length,
          collaborators: collabCount ?? 0,
          collaborations: activityCount ?? 0,
        });
        setRecentUsers(users || []);
        setRecentNotes(notes || []);
      } catch (err) {
        console.error("Error loading admin stats:", err);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  if (!user || loading) {
    return (
      <DashboardLayout
        user={
          user || fallbackProfile({ user_type: "admin" })
        }
        variant="admin"
      >
        <div
          style={{
            padding: "var(--space-20)",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          Loading admin dashboard…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} variant="admin">
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            marginBottom: "var(--space-1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-md)",
              background: "var(--color-warning-subtle)",
              border: "1px solid var(--color-warning)",
              color: "var(--color-warning)",
            }}
          >
            <Icon d={IC.shield} size={14} />
          </div>
          <h1
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: "var(--font-weight-bold)",
              letterSpacing: "var(--letter-spacing-tight)",
              margin: 0,
            }}
          >
            Admin overview
          </h1>
        </div>
        <p
          style={{
            margin: 0,
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          Platform-wide stats and recent activity.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-8)",
        }}
      >
        <StatCard
          label="Total users"
          value={stats.users}
          icon={IC.users}
          sub="across all accounts"
        />
        <StatCard
          label="Total folders"
          value={stats.folders}
          icon={IC.folder}
          sub={`+ ${stats.subfolders} subfolders`}
        />
        <StatCard
          label="Total notes"
          value={stats.notes}
          icon={IC.notes}
          sub="all visibility"
        />
        <StatCard
          label="Public notes"
          value={stats.publicNotes}
          icon={IC.globe}
          sub="publicly accessible"
        />
        <StatCard
          label="Collaborators"
          value={stats.collaborators}
          icon={IC.users}
          sub="invited to items"
        />
        <StatCard
          label="Activity log"
          value={stats.collaborations}
          icon={IC.bell}
          sub="invite/revoke events"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-6)",
        }}
        className="admin-grid"
      >
        {/* Recent users */}
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
                margin: 0,
              }}
            >
              Recent users
            </h3>
            <Link to="/admin/dashboard/users">
              <Button variant="ghost" size="xs">
                View all →
              </Button>
            </Link>
          </div>
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              overflow: "hidden",
            }}
          >
            {recentUsers.map((u, i) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-3) var(--space-4)",
                  gap: "var(--space-3)",
                  borderBottom:
                    i < recentUsers.length - 1
                      ? "1px solid var(--color-border-subtle)"
                      : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "var(--radius-full)",
                      background:
                        u.user_type === "admin"
                          ? "var(--color-warning)"
                          : "var(--color-accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: "var(--font-weight-bold)",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {u.full_name.charAt(0)}
                  </div>
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
                      {u.full_name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {formatDate(u.created_at)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={u.user_type === "admin" ? "warning" : "default"}
                >
                  {u.user_type}
                </Badge>
              </div>
            ))}
          </div>
        </div>

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
                margin: 0,
              }}
            >
              Recent notes
            </h3>
            <Link to="/admin/dashboard/notes">
              <Button variant="ghost" size="xs">
                View all →
              </Button>
            </Link>
          </div>
          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              overflow: "hidden",
            }}
          >
            {recentNotes.map((note, i) => (
              <div
                key={note.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-3) var(--space-4)",
                  gap: "var(--space-3)",
                  borderBottom:
                    i < recentNotes.length - 1
                      ? "1px solid var(--color-border-subtle)"
                      : "none",
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
                    }}
                  >
                    {note.folder?.title}
                  </p>
                </div>
                <Badge
                  variant={note.visibility === "public" ? "accent" : "muted"}
                >
                  {note.visibility}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 768px) { .admin-grid { grid-template-columns: 1fr !important; } }`}</style>
    </DashboardLayout>
  );
}
