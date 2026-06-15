import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge, Button } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { ShareModal } from "@/components/ShareModal";
import { formatDate } from "@/lib/helpers";
import { ShareButtons } from "@/components/ShareButtons";
import { useToast } from "@/components/Toast";
import type { Folder, Note } from "@/types";
import { SeoHead } from "@/components/SeoHead";

export function FolderDetailPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [ownerUsername, setOwnerUsername] = useState<string>("");
  const [isOwner, setIsOwner] = useState(false);
  const [notes, setNotes] = useState<
    Pick<Note, "id" | "title" | "description" | "slug" | "updated_at" | "visibility">[]
  >([]);
  const [subfolders, setSubfolders] = useState<
    Pick<Folder, "id" | "title" | "description" | "slug" | "visibility">[]
  >([]);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { title: string; slug: string }[]
  >([]);
  const { addToast } = useToast();
  const [shareItem, setShareItem] = useState<Folder | null>(null);

  // Listen for share-copy events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string };
      addToast(detail.message, "info");
    };
    window.addEventListener("share-copy", handler);
    return () => window.removeEventListener("share-copy", handler);
  }, [addToast]);

  useEffect(() => {
    if (!slug || !username) return;
    const load = async () => {
      try {
        const supabase = requireSupabase();

        // Find owner by username (using public_profiles for anon-safe access)
        const { data: owner } = await supabase
          .from("public_profiles")
          .select("id, username")
          .eq("username", username)
          .single();

        if (!owner) {
          setLoading(false);
          return;
        }

        setOwnerUsername(owner.username);
        setIsOwner(authUser?.id === owner.id);

        // Find folder by slug AND owner_id — no visibility filter
        // The server-side RLS policy (has_access_to_folder) will restrict
        // private folders from anon users. For the owner, we bypass the filter.
        const query = supabase
          .from("folders")
          .select("*")
          .eq("slug", slug)
          .eq("owner_id", owner.id);

        // Anon users can only see public folders; owner can see their own
        if (!authUser || authUser.id !== owner.id) {
          query.eq("visibility", "public");
        }

        const { data: folderData } = await query.single();

        if (!folderData) {
          setLoading(false);
          return;
        }

        setFolder(folderData);

        // Get subfolders — owner sees all, others only public
        const subQuery = supabase
          .from("folders")
          .select("id, title, description, slug, visibility")
          .eq("parent_id", folderData.id);

        if (!authUser || authUser.id !== owner.id) {
          subQuery.eq("visibility", "public");
        }

        const { data: subfolderData } = await subQuery.order("title", { ascending: true });

        setSubfolders(subfolderData || []);

        // Build full breadcrumb trail from root to current folder
        const allOwnerFolders = await supabase
          .from("folders")
          .select("id, title, slug, parent_id")
          .eq("owner_id", owner.id);

        if (allOwnerFolders.data) {
          const parentMap: Record<string, { id: string; title: string; slug: string; parent_id: string | null }> = {};
          for (const f of allOwnerFolders.data) {
            parentMap[f.id] = f;
          }

          const crumbs: { title: string; slug: string }[] = [{ title: folderData.title, slug: folderData.slug }];
          let currentId = folderData.parent_id;
          let maxDepth = 0;
          while (currentId && maxDepth < 20) {
            const entry = parentMap[currentId];
            if (!entry) break;
            crumbs.unshift({ title: entry.title, slug: entry.slug });
            currentId = entry.parent_id;
            maxDepth++;
          }
          setBreadcrumbs(crumbs);
        }

        // Get notes in this folder — owner sees all, others only public
        const notesQuery = supabase
          .from("notes")
          .select("id, title, description, slug, updated_at, visibility, owner_id")
          .eq("folder_id", folderData.id);

        if (!authUser || authUser.id !== owner.id) {
          notesQuery.eq("visibility", "public");
        }

        const { data: notesData } = await notesQuery;

        setNotes(notesData || []);
      } catch (err) {
        console.error("Error loading folder:", err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug, username, authUser]);

  if (loading) {
    return (
      <>
        <SeoHead title="Loading\u2026" />
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
        <SeoHead title="Folder Not Found" />
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

  const isPrivate = folder.visibility === "private";

  // Determine owner's dashboard link
  const editFolderLink = isOwner ? `/dashboard/folders` : null;

    return (
      <>
        <SeoHead title={folder.title} description={folder.description ?? undefined} />
        <Navbar />
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "var(--space-16) var(--space-8)",
          minHeight: "90vh",
        }}
      >
        {/* Breadcrumb trail */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--font-size-sm)",
            marginBottom: "var(--space-4)",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/folders"
            style={{ color: "var(--color-text-muted)", textDecoration: "none" }}
          >
            Folders
          </Link>
          {breadcrumbs.slice(0, -1).map((crumb) => (
            <span key={crumb.slug} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span style={{ color: "var(--color-border-strong)", userSelect: "none" }}>/</span>
              <Link
                to={`/${ownerUsername}/folder/${crumb.slug}`}
                style={{
                  color: "var(--color-text-muted)",
                  textDecoration: "none",
                  transition: "color var(--duration-fast)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
              >
                {crumb.title}
              </Link>
            </span>
          ))}
          <span style={{ color: "var(--color-border-strong)", userSelect: "none" }}>/</span>
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
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
            <h1
              style={{
                fontSize: "var(--font-size-3xl)",
                fontWeight: "var(--font-weight-bold)",
                margin: 0,
              }}
            >
              {folder.title}
            </h1>
            {isPrivate && (
              <Badge variant="muted" style={{ alignSelf: "center" }}>Private</Badge>
            )}
          </div>
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
              {subfolders.map((sub) => {
              // Check if this subfolder is private — we fetched all subfolders the user has access to,
              // but we don't have the visibility field here. We'll note it in the display.
              // (The subfolder query already filtered for public for non-owners)
              return (
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
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "var(--font-size-sm)",
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                          }}
                        >                        {sub.title}
                          </p>
                        {isOwner && sub.visibility === "private" && (
                          <Badge variant="muted" style={{ fontSize: 10, padding: "1px 8px", lineHeight: "18px", marginLeft: "var(--space-2)" }}>
                            Private
                          </Badge>
                        )}
                      </div>
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
              );
            })}
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
            {notes.map((note) => {
              const isNotePrivate = (note as Record<string, unknown>).visibility === "private";
              return (
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
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "2px" }}>
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
                        {isOwner && isNotePrivate && (
                          <Badge variant="muted" style={{ fontSize: 10, padding: "1px 8px", lineHeight: "18px" }}>
                            Private
                          </Badge>
                        )}
                      </div>
                      {note.description && (
                        <p
                          style={{
                            margin: 0,
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
                        flexShrink: 0,
                      }}
                    >
                      {formatDate(note.updated_at)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "var(--space-16)",
              color: "var(--color-text-muted)",
            }}
          >
            <p>{isOwner ? "No notes in this folder yet." : "No public notes in this folder yet."}</p>
          </div>
        )}

        {/* Social share — visible to everyone */}
        <div style={{ marginTop: "var(--space-8)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--color-border)" }}>
          <ShareButtons
            url={`/${ownerUsername}/folder/${folder.slug}`}
            title={folder.title}
            description={folder.description ?? undefined}
          />
        </div>

        {/* Owner actions — only visible to the owner */}
        {isOwner && (
          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-6)" }}>
            {isPrivate && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShareItem(folder)}
              >
                Share
              </Button>
            )}
            <a href={editFolderLink || "#"} style={{ textDecoration: "none" }}>
              <Button variant="primary" size="sm">
                Edit folder
              </Button>
            </a>
          </div>
        )}
      </div>
      <Footer />

      {/* Share Modal */}
      {shareItem && (
        <ShareModal
          isOpen={!!shareItem}
          onClose={() => setShareItem(null)}
          itemId={shareItem.id}
          itemTitle={shareItem.title}
          itemType="folder"
          itemSlug={shareItem.slug}
          ownerUsername={ownerUsername}
          ownerId={authUser?.id}
        />
      )}

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
