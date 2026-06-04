import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge, Button } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FolderDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [folder, setFolder] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notes, setNotes] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parentFolder, setParentFolder] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      try {
        const supabase = requireSupabase();

        // Find folder by slug
        const { data: folderData } = await supabase
          .from("folders")
          .select("*")
          .eq("visibility", "public")
          .eq("slug", slug)
          .single();

        if (!folderData) {
          setLoading(false);
          return;
        }

        setFolder(folderData);

        // Get parent if exists
        if (folderData.parent_id) {
          const { data: parentData } = await supabase
            .from("folders")
            .select("id, title, slug")
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
  }, [slug]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: "var(--space-16) var(--space-8)",
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
            maxWidth: "900px",
            margin: "0 auto",
            padding: "var(--space-16) var(--space-8)",
            textAlign: "center",
          }}
        >
          <h2>Folder not found</h2>
          <p style={{ color: "var(--color-text-muted)" }}>
            This folder may be private or does not exist.
          </p>
          <Link to="/folders">
            <Button variant="primary" size="sm">
              Browse folders
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
          maxWidth: "900px",
          margin: "0 auto",
          padding: "var(--space-16) var(--space-8)",
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
          <span style={{ color: "var(--color-border-strong)" }}>/</span>
          {parentFolder && (
            <>
              <Link
                to={`/folder/${parentFolder.slug}`}
                style={{
                  color: "var(--color-text-muted)",
                  textDecoration: "none",
                }}
              >
                {parentFolder.title}
              </Link>
              <span style={{ color: "var(--color-border-strong)" }}>/</span>
            </>
          )}
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
                to={`/n/${note.slug}`}
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
    </>
  );
}
