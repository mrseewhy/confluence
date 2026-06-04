import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Badge, Button, EmptyState } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface UserRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  user_type: "user" | "admin";
  created_at: string;
  notes_count: number;
  folders_count: number;
}

export function AdminUsers() {
  const { profile } = useAuth();
  const user = profile;

  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "user">("all");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const supabase = requireSupabase();

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, user_type, created_at");

        if (!profiles) return;

        const { data: notesData } = await supabase
          .from("notes")
          .select("owner_id");

        const { data: foldersData } = await supabase
          .from("folders")
          .select("owner_id");

        const noteCounts: Record<string, number> = {};
        const folderCounts: Record<string, number> = {};

        (notesData || []).forEach((n) => {
          noteCounts[n.owner_id] = (noteCounts[n.owner_id] || 0) + 1;
        });
        (foldersData || []).forEach((f) => {
          folderCounts[f.owner_id] = (folderCounts[f.owner_id] || 0) + 1;
        });

        const rows: UserRow[] = profiles.map((p) => ({
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          user_type: p.user_type as "user" | "admin",
          created_at: p.created_at,
          notes_count: noteCounts[p.id] || 0,
          folders_count: folderCounts[p.id] || 0,
        }));

        setUsersList(rows);
      } catch (err) {
        console.error("Error loading users:", err);
      } finally {
        setLoading(false);
      }
    };
    void loadUsers();
  }, []);

  const filtered = usersList.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) &&
      (filter === "all" || u.user_type === filter)
    );
  });

  if (!user || loading) {
    return (
      <DashboardLayout
        user={
          user || {
            id: "",
            full_name: "Loading...",
            avatar_url: null,
            user_type: "admin",
            created_at: "",
          }
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
          Loading users…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} variant="admin">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "var(--space-6)",
          flexWrap: "wrap",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: "var(--font-weight-bold)",
              letterSpacing: "var(--letter-spacing-tight)",
              marginBottom: "var(--space-1)",
            }}
          >
            Users
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {usersList.length} registered user
            {usersList.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div
        style={{
          background: "var(--color-warning-subtle)",
          border: "1px solid var(--color-warning)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-3) var(--space-5)",
          marginBottom: "var(--space-6)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-warning)",
        }}
      >
        <Icon d={IC.shield} size={16} />
        <span>
          To promote a user to <strong>admin</strong>, update their user_type
          directly in the Supabase dashboard:{" "}
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.85em",
              background: "rgba(0,0,0,0.08)",
              padding: "1px 6px",
              borderRadius: "4px",
            }}
          >
            UPDATE profiles SET user_type = 'admin' WHERE id = 'user-id';
          </code>
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
          flexWrap: "wrap",
        }}
      >
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 220px",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-primary)",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-2) var(--space-3)",
            outline: "none",
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
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {(["all", "admin", "user"] as const).map((v) => (
            <Button
              key={v}
              variant={filter === v ? "accent-ghost" : "secondary"}
              size="sm"
              onClick={() => setFilter(v)}
              style={{ textTransform: "capitalize" }}
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div
          style={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 60px 60px 80px 80px",
              gap: "var(--space-4)",
              padding: "var(--space-3) var(--space-5)",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-bg-subtle)",
            }}
          >
            {["User", "Role", "Notes", "Folders", "Joined"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: "11px",
                  fontWeight: "var(--font-weight-semibold)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {filtered.map((u, i) => (
            <div
              key={u.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 60px 60px 80px 80px",
                gap: "var(--space-4)",
                alignItems: "center",
                padding: "var(--space-4) var(--space-5)",
                borderBottom:
                  i < filtered.length - 1
                    ? "1px solid var(--color-border-subtle)"
                    : "none",
                transition: "background var(--duration-fast)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-bg-subtle)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
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
                    width: "32px",
                    height: "32px",
                    borderRadius: "var(--radius-full)",
                    background:
                      u.user_type === "admin"
                        ? "var(--color-warning)"
                        : "var(--color-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "var(--font-weight-bold)",
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {u.full_name.charAt(0)}
                </div>
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
                  {u.id === user.id && (
                    <span
                      style={{
                        marginLeft: "var(--space-2)",
                        fontSize: "10px",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      (you)
                    </span>
                  )}
                </p>
              </div>
              <Badge variant={u.user_type === "admin" ? "warning" : "default"}>
                {u.user_type}
              </Badge>
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {u.notes_count}
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {u.folders_count}
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                }}
              >
                {formatDate(u.created_at)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="👥"
          title="No users found"
          description="Try adjusting your search or filters."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
    </DashboardLayout>
  );
}
