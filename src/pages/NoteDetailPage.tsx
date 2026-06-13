import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge, Button } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { ShareModal } from "@/components/ShareModal";
import { formatDate, detectVideoProvider, getVideoEmbedUrl } from "@/lib/helpers";
import { ShareButtons } from "@/components/ShareButtons";
import { useToast } from "@/components/Toast";
import type { Note, NoteBlock } from "@/types";

export function NoteDetailPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<Note | null>(null);
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [ownerUsername, setOwnerUsername] = useState<string>("");
  const { addToast } = useToast();
  const [showShareModal, setShowShareModal] = useState(false);

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

        // Find note by slug AND owner_id.
        // Always filter by visibility for security: only the owner
        // may see their private notes through this public endpoint.
        const query = supabase
          .from("notes")
          .select("*, owner_id, folder:folders(id, title, slug)")
          .eq("slug", slug)
          .eq("owner_id", owner.id);

        // Non-owners can only see public notes — prevents the brief
        // flash of private content before the fallback renders and
        // provides defense-in-depth against RLS misconfiguration.
        if (!authUser || authUser.id !== owner.id) {
          query.eq("visibility", "public");
        }

        const { data: noteData } = await query.single();

        if (!noteData) {
          setLoading(false);
          return;
        }

        setNote(noteData);

        // Get blocks
        const { data: blocksData } = await supabase
          .from("note_blocks")
          .select("*")
          .eq("note_id", noteData.id)
          .order("order_index", { ascending: true });

        setBlocks(blocksData || []);
      } catch (err) {
        console.error("Error loading note:", err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug, username, authUser]);

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
          Loading note…
        </div>
        <Footer />
      </>
    );
  }

  if (!note) {
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
          <h2>Note not found</h2>
          <p style={{ color: "var(--color-text-muted)" }}>
            This note may be private or does not exist.
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

  const isPublic = note.visibility === "public";
  const isOwner = authUser?.id === note.owner_id;

  // Only block non-owner viewers from seeing private notes
  if (!isPublic && !isOwner) {
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
          <h2>Private note</h2>
          <p style={{ color: "var(--color-text-muted)" }}>
            This note is private and cannot be viewed publicly.
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
            marginBottom: "var(--space-6)",
          }}
        >
          <Link
            to="/notes"
            style={{ color: "var(--color-text-muted)", textDecoration: "none" }}
          >
            Notes
          </Link>
          {note.folder && (
            <>
              <span style={{ color: "var(--color-border-strong)" }}>/</span>
              <Link
                to={`/${ownerUsername}/folder/${note.folder.slug}`}
                style={{
                  color: "var(--color-text-muted)",
                  textDecoration: "none",
                }}
              >
                {note.folder.title}
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
            {note.title}
          </span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
            <h1
              style={{
                fontSize: "var(--font-size-3xl)",
                fontWeight: "var(--font-weight-bold)",
                margin: 0,
              }}
            >
              {note.title}
            </h1>
            {!isPublic && (
              <Badge variant="muted" style={{ alignSelf: "center" }}>Private</Badge>
            )}
          </div>
          {note.description && (
            <p
              style={{
                color: "var(--color-text-secondary)",
                fontSize: "var(--font-size-lg)",
              }}
            >
              {note.description}
            </p>
          )}
          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              marginTop: "var(--space-4)",
              flexWrap: "wrap",
            }}
          >
            {note.folder && <Badge variant="muted">{note.folder.title}</Badge>}
            <Badge variant="accent">{isPublic ? "Public" : "Private"}</Badge>
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
                alignSelf: "center",
              }}
            >
              Updated {formatDate(note.updated_at)}
            </span>
          </div>
        </div>

        {/* Blocks */}
        {blocks.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-6)",
            }}
          >
            {blocks.map((block) => (
              <div
                key={block.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-xl)",
                  overflow: "hidden",
                  background:
                    block.type === "code"
                      ? "var(--color-code-bg)"
                      : "var(--color-bg-elevated)",
                }}
              >
                <div
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: "1px solid var(--color-border)",
                    background:
                      block.type === "code"
                        ? "rgba(0,0,0,0.3)"
                        : "var(--color-bg-subtle)",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color:
                        block.type === "code"
                          ? "rgba(232,230,242,0.45)"
                          : "var(--color-text-muted)",
                    }}
                  >
                    {block.type}
                  </span>
                  {block.metadata?.language && (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "var(--color-text-muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {block.metadata.language}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    padding: block.type === "code" ? "0" : "var(--space-4)",
                  }}
                >
                  {block.type === "code" ? (
                    <pre
                      style={{
                        margin: 0,
                        padding: "var(--space-4)",
                        overflow: "auto",
                        fontSize: "var(--font-size-sm)",
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-code-text)",
                      }}
                    >
                      <code>{block.content}</code>
                    </pre>
                  ) : block.type === "image" ? (
                    <div>
                      <img
                        src={block.content}
                        alt={block.metadata?.alt || ""}
                        style={{
                          maxWidth: "100%",
                          borderRadius: "var(--radius-md)",
                        }}
                      />
                      {block.metadata?.caption && (
                        <p
                          style={{
                            fontSize: "var(--font-size-xs)",
                            color: "var(--color-text-muted)",
                            marginTop: "var(--space-2)",
                          }}
                        >
                          {block.metadata.caption}
                        </p>
                      )}
                    </div>
                  ) : block.type === "video" ? (
                    (() => {
                      const provider = detectVideoProvider(block.content);
                      const embedUrl = provider ? getVideoEmbedUrl(block.content, provider) : null;
                      return embedUrl ? (
                        <div
                          style={{
                            position: "relative",
                            paddingBottom: "56.25%",
                            height: 0,
                          }}
                        >
                          <iframe
                            src={embedUrl}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              borderRadius: "var(--radius-md)",
                              border: "none",
                            }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                          />
                          {block.metadata?.caption && (
                            <p
                              style={{
                                fontSize: "var(--font-size-xs)",
                                color: "var(--color-text-muted)",
                                marginTop: "var(--space-2)",
                                textAlign: "center",
                              }}
                            >
                              {block.metadata.caption}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: "var(--space-6)",
                            textAlign: "center",
                            color: "var(--color-text-muted)",
                            fontSize: "var(--font-size-sm)",
                          }}
                        >
                          <p style={{ margin: 0 }}>
                            Unsupported video URL. Please open it directly.
                          </p>
                          {block.content.startsWith("http") && (
                            <a
                              href={block.content}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: "var(--font-size-xs)",
                                color: "var(--color-accent)",
                                marginTop: "var(--space-2)",
                                display: "inline-block",
                              }}
                            >
                              Open video →
                            </a>
                          )}
                        </div>
                      );
                    })()
                  ) : block.type === "heading" ? (
                    (() => {
                      const level = (block.metadata?.level as string) || "h2";
                      const style = {
                        margin: 0,
                        lineHeight: "var(--line-height-tight)",
                        letterSpacing: "var(--letter-spacing-tight)",
                        color: "var(--color-text-primary)",
                      };
                      if (level === "h1")
                        return (
                          <h1
                            style={{
                              ...style,
                              fontSize: "var(--font-size-3xl)",
                              fontWeight: "var(--font-weight-bold)",
                            }}
                          >
                            {block.content}
                          </h1>
                        );
                      if (level === "h3")
                        return (
                          <h3
                            style={{
                              ...style,
                              fontSize: "var(--font-size-xl)",
                              fontWeight: "var(--font-weight-semibold)",
                            }}
                          >
                            {block.content}
                          </h3>
                        );
                      return (
                        <h2
                          style={{
                            ...style,
                            fontSize: "var(--font-size-2xl)",
                            fontWeight: "var(--font-weight-bold)",
                          }}
                        >
                          {block.content}
                        </h2>
                      );
                    })()
                  ) : (
                    <div
                      style={{
                        fontSize: "var(--font-size-base)",
                        lineHeight: "var(--line-height-loose)",
                        color: "var(--color-text-primary)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {block.content}
                    </div>
                  )}
                </div>
              </div>
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
            <p>This note has no content blocks.</p>
          </div>
        )}

        {/* Social share — visible to everyone */}
        <div style={{ marginTop: "var(--space-8)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--color-border)" }}>
          <ShareButtons
            url={`/${ownerUsername}/n/${note.slug}`}
            title={note.title}
            description={note.description ?? undefined}
          />
        </div>

        {/* Owner actions — only visible to the owner */}
        {isOwner && (
          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-6)" }}>
            {!isPublic && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowShareModal(true)}
              >
                Share
              </Button>
            )}
            <a href={`/dashboard/notes/${note.slug}/edit`} style={{ textDecoration: "none" }}>
              <Button variant="primary" size="sm">
                Edit note
              </Button>
            </a>
          </div>
        )}
      </div>
      <Footer />

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          itemId={note.id}
          itemTitle={note.title}
          itemType="note"
          itemSlug={note.slug}
          ownerUsername={ownerUsername}
          ownerId={authUser?.id}
        />
      )}
    </>
  );
}
