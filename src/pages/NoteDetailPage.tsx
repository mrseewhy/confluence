import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { ShareModal } from "@/components/ShareModal";
import { TransferOwnershipModal } from "@/components/TransferOwnershipModal";
import { formatDate, detectVideoProvider, getVideoEmbedUrl, sanitizeImageUrl } from "@/lib/helpers";
import { ShareButtons } from "@/components/ShareButtons";
import { useToast } from "@/components/Toast";
import { Badge, Button } from "@/components/ui";
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
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [collaborators, setCollaborators] = useState<{ email: string; access_level: string }[]>([]);

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

        // Step 1: Fetch the note by slug (no visibility filter yet)
        // We need the note UUID to check collaborator status
        const { data: noteData } = await supabase
          .from("notes")
          .select("*, owner_id, folder:folders(id, title, slug)")
          .eq("slug", slug)
          .eq("owner_id", owner.id)
          .single();

        if (!noteData) {
          setLoading(false);
          return;
        }

        // Step 2: Determine if user can view this note
        const isOwner = authUser?.id === noteData.owner_id;
        const isPublic = noteData.visibility === "public";
        
        // Check collaborator status for non-owners of private notes
        let canView = isOwner || isPublic;
        if (!canView && authUser) {
          const { data: authData } = await supabase.auth.getUser();
          const userEmail = authData?.user?.email;
          if (userEmail) {
            const { data: collab } = await supabase
              .from("collaborators")
              .select("id")
              .eq("note_id", noteData.id)
              .eq("invitee_email", userEmail)
              .maybeSingle();
            if (collab) {
              canView = true;
              setIsCollaborator(true);
            }
          }
        }

        if (!canView) {
          // Private note and user isn't owner or collaborator — show fallback
          setLoading(false);
          return;
        }

        setNote(noteData);

        // Fetch collaborators for this note (owner sees them inline)
        if (isOwner) {
          const { data: collabs } = await supabase
            .from("collaborators")
            .select("invitee_email, access_level")
            .eq("note_id", noteData.id);
          setCollaborators((collabs || []).map((c: { invitee_email: string; access_level: string }) => ({ email: c.invitee_email, access_level: c.access_level })));
        }

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

  // Only block non-owner/non-collaborator viewers from seeing private notes
  if (!isPublic && !isOwner && !isCollaborator) {
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
                        src={sanitizeImageUrl(block.content) ?? ''}
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
                            sandbox="allow-scripts allow-same-origin allow-presentation"
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

        {/* Collaborators inline — owner sees who has access without opening modal */}
        {isOwner && collaborators.length > 0 && (
          <div
            style={{
              marginTop: "var(--space-5)",
              padding: "var(--space-4) var(--space-5)",
              background: "var(--color-bg-subtle)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <p
              style={{
                margin: "0 0 var(--space-3)",
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              Collaborators ({collaborators.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {collaborators.map((c) => (
                <div key={c.email} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <div
                    style={{
                      width: "24px", height: "24px", borderRadius: "var(--radius-full)",
                      background: "var(--color-accent-subtle)", color: "var(--color-accent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "10px", fontWeight: "var(--font-weight-bold)", flexShrink: 0,
                    }}
                  >
                    {c.email.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
                    {c.email}
                  </span>
                  <Badge variant={c.access_level === "editor" ? "success" : "default"} style={{ fontSize: "9px", textTransform: "capitalize" }}>
                    {c.access_level}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Owner actions — only visible to the owner */}
        {isOwner && (
          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-6)", flexWrap: "wrap" }}>
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTransferModal(true)}
            >
              Transfer
            </Button>
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

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <TransferOwnershipModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onTransfer={async (newOwnerId: string, _newOwnerName: string, _newOwnerEmail: string) => {
            try {
              const supabase = requireSupabase();
              const { error } = await supabase
                .from("notes")
                .update({ owner_id: newOwnerId })
                .eq("id", note.id);
              if (error) throw error;
              addToast("Ownership transferred successfully", "success");
              setShowTransferModal(false);
              // Redirect to dashboard — original owner no longer has access
              window.location.href = "/dashboard/notes";
            } catch (err) {
              console.error("Error transferring ownership:", err);
              addToast("Failed to transfer ownership", "error");
            }
          }}
          itemTitle={note.title}
          currentOwnerName={authUser?.full_name || null}
        />
      )}
    </>
  );
}
