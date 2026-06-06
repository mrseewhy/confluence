import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge, Button } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";
import { formatDate } from "@/lib/helpers";
import type { Folder, Note } from "@/types";

export function FolderDetailPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [ownerUsername, setOwnerUsername] = useState<string>("");
  const [notes, setNotes] = useState<
    Pick<Note, "id" | "title" | "description" | "slug" | "updated_at" | "visibility">[]
  >([]);
  const [subfolders, setSubfolders] = useState<
    Pick<Folder, "id" | "title" | "description" | "slug">[]
  >([]);
  const [parentFolder, setParentFolder] = useState<
    Pick<Folder, "id" | "title" | "slug" | "owner_id"> | null
  >(null);

  useEffect(() => {
    if (!slug || !username) return;
    const load = async () => {
      try {
        const supabase = requireSupabase();

        // Find owner by username
        const { data: owner } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("username", username)
          .single();

        if (!owner) {
          setLoading(false);
          return;
        }

        setOwnerUsername(owner.username);

        // Find folder by slug AND owner_id
        const { data: folderData } = await supabase
          .from("folders")
          .select("*")
          .eq("visibility", "public")
          .eq("slug", slug)
          .eq("owner_id", owner.id)
          .single();

        if (!folderData) {
          setLoading(false);
          return;
        }

        setFolder(folderData);

        // Get subfolders
        const { data: subfolderData } = await supabase
          .from("folders")
          .select("id, title, description, slug")
          .eq("parent_id", folderData.id)
          .eq("visibility", "public")
          .order("title", { ascending: true });

        setSubfolders(subfolderData || []);

        // Get parent if exists
        if (folderData.parent_id) {
          const { data: parentData } = await supabase
            .from("folders")
            .select("id, title, slug, owner_id")
            .eq("id", folderData.parent_id)
            .single();
          setParentFolder(parentData);
        }

        // Get notes in this folder
        const { data: notesData } = await supabase
          .from("notes")
          .select("id, title, description, slug, updated_at, visibility")
          .eq("folder_id", folderData.id)
          .eq("visibility", "public");

        setNotes(notesData || []);
      } catch (err) {
        console.error("Error loading folder:", err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug, username]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "var(--space-16) var(--space-8)",
            minHeight: "90vh",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          Loading folder…
        </div>
        <Footer />
      </>
    );
  }

  if (!folder) {
    return (
      <>
        <Navbar />
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "var(--space-16) var(--space-8)",
            minHeight: "90vh",
            textAlign: "center",
          }}
        >
          <h2>Folder not found</h2>
          <p style={{ color: "var(--color-text-muted)" }}>
            This folder may be private or does not exist.
          </p>
          <Link to="/">
            <Button variant="primary" size="sm">
              Go home
            </Button>
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "var(--space-16) var(--space-8)",
          minHeight: "90vh",
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--font-size-sm)",
            marginBottom: "var(--space-4)",
          }}
        >
          <Link
            to="/folders"
            style={{ color: "var(--color-text-muted)", textDecoration: "none" }}
          >
            Folders
          </Link>
          {parentFolder && (
            <>
              <span style={{ color: "var(--color-border-strong)" }}>/</span>
              <Link
                to={`/${ownerUsername}/folder/${parentFolder.slug}`}
                style={{
                  color: "var(--color-text-muted)",
                  textDecoration: "none",
                }}
              >
                {parentFolder.title}
              </Link>
            </>
          )}
          <span style={{ color: "var(--color-border-strong)" }}>/</span>
          <span
            style={{
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
            }}
          >
            {folder.title}
          </span>
        </div>

        <div style={{ marginBottom: "var(--space-8)" }}>
          <h1
            style={{
              fontSize: "var(--font-size-3xl)",
              fontWeight: "var(--font-weight-bold)",
            }}
          >
            {folder.title}
          </h1>
          {folder.description && (
            <p style={{ color: "var(--color-text-secondary)" }}>
              {folder.description}
            </p>
          )}
          <Badge variant="accent" style={{ marginTop: "var(--space-2)" }}>
            {notes.length} note{notes.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Subfolders */}
        {subfolders.length > 0 && (
          <div style={{ marginBottom: "var(--space-8)" }}>
            <h3
              style={{
                fontSize: "var(--font-size-md)",
                fontWeight: 600,
                color: "var(--color-text-primary)",
                margin: "0 0 var(--space-4)",
              }}
            >
              Subfolders
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "var(--space-3)",
              }}
            >
              {subfolders.map((sub) => (
                <Link
                  key={sub.id}
                  to={`/${ownerUsername}/folder/${sub.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "var(--space-3)",
                      padding: "var(--space-4) var(--space-5)",
                      background: "var(--color-bg-base)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-lg)",
                      transition: "all 0.15s ease",
                    }}
                    className="subfolder-card-hover"
                  >
                    <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>📂</span>
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "var(--font-size-sm)",
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {sub.title}
                      </p>
                      {sub.description && (
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: "var(--font-size-xs)",
                            color: "var(--color-text-muted)",
                            lineHeight: 1.4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {sub.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {notes.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {notes.map((note) => (
              <Link
                key={note.id}
                to={`/${ownerUsername}/n/${note.slug}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-4) var(--space-5)",
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-xl)",
                    transition: "all var(--duration-normal)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--color-accent-muted)";
                    e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {note.title}
                    </p>
                    {note.description && (
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {note.description}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {formatDate(note.updated_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "var(--space-16)",
              color: "var(--color-text-muted)",
            }}
          >
            <p>No public notes in this folder yet.</p>
          </div>
        )}
      </div>
      <Footer />

      <style>{`
        .subfolder-card-hover {
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .subfolder-card-hover:hover {
          border-color: var(--color-accent-muted) !important;
          background: var(--color-bg-elevated) !important;
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }
      `}</style>
    </>
  );
}
