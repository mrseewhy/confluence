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

export function AdminNotes() {
  const { profile } = useAuth();
  const user = profile;

  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notesList, setNotesList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [vis, setVis] = useState<"all" | "public" | "private">("all");

  useEffect(() => {
    const loadNotes = async () => {
      try {
        const supabase = requireSupabase();
        const { data } = await supabase
          .from("notes")
          .select("*, folder:folders(id, title, slug)")
          .order("updated_at", { ascending: false });

        if (!data) return;
        setNotesList(data);
      } catch (err) {
        console.error("Error loading notes:", err);
      } finally {
        setLoading(false);
      }
    };
    void loadNotes();
  }, []);

  const filtered = notesList.filter((n) => {
    const q = search.toLowerCase();
    return (
      (n.title.toLowerCase().includes(q) ||
        (n.description ?? "").toLowerCase().includes(q) ||
        (n.folder?.title ?? "").toLowerCase().includes(q)) &&
      (vis === "all" || n.visibility === vis)
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
          Loading notes…
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
            All Notes
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {notesList.length} note{notesList.length !== 1 ? "s" : ""} across
            the platform
          </p>
        </div>
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
          placeholder="Search notes…"
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
          {(["all", "public", "private"] as const).map((v) => (
            <Button
              key={v}
              variant={vis === v ? "accent-ghost" : "secondary"}
              size="sm"
              onClick={() => setVis(v)}
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
              gridTemplateColumns: "1fr 160px 90px 120px",
              gap: "var(--space-4)",
              padding: "var(--space-3) var(--space-5)",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-bg-subtle)",
            }}
          >
            {["Note", "Folder", "Visibility", "Updated"].map((h) => (
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

          {filtered.map((note, i) => (
            <div
              key={note.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px 90px 120px",
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
                    borderRadius: "var(--radius-lg)",
                    background: "var(--color-accent-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-accent)",
                    flexShrink: 0,
                  }}
                >
                  <Icon d={IC.notes} size={15} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--font-size-sm)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--color-text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {note.title}
                  </p>
                  {note.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {note.description}
                    </p>
                  )}
                </div>
              </div>
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {note.folder?.title ?? "\u2014"}
              </span>
              <Badge
                variant={note.visibility === "public" ? "accent" : "muted"}
              >
                {note.visibility}
              </Badge>
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                }}
              >
                {formatDate(note.updated_at)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="📝"
          title="No notes found"
          description="Try adjusting your search or filters."
        />
      )}
    </DashboardLayout>
  );
}
