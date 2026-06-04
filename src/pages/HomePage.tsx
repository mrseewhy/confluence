// import { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
// import { Navbar } from "@/components/layout/Navbar";
// import { Footer } from "@/components/layout/Footer";
// import { Button, Badge } from "@/components/ui";
// import { requireSupabase } from "@/lib/supabase";

// function formatDate(iso: string) {
//   return new Date(iso).toLocaleDateString("en-US", {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// }

// export function HomePage() {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const [publicFolders, setPublicFolders] = useState<any[]>([]);
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const [publicNotes, setPublicNotes] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true); // eslint-disable-line @typescript-eslint/no-unused-vars

//   useEffect(() => {
//     const loadPublicContent = async () => {
//       try {
//         const supabase = requireSupabase();

//         const { data: folders } = await supabase
//           .from("folders")
//           .select("id, title, description, slug, updated_at, note_count")
//           .is("parent_id", null)
//           .eq("visibility", "public")
//           .order("updated_at", { ascending: false })
//           .limit(3);

//         const { data: notes } = await supabase
//           .from("notes")
//           .select(
//             "id, title, description, slug, updated_at, visibility, folder:folders(id, title, slug)",
//           )
//           .eq("visibility", "public")
//           .order("updated_at", { ascending: false })
//           .limit(3);

//         setPublicFolders(folders || []);
//         setPublicNotes(notes || []);
//       } catch (err) {
//         console.error("Error loading public content:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     void loadPublicContent();
//   }, []);

//   return (
//     <>
//       <Navbar />

//       {/* Hero */}
//       <section
//         style={{
//           minHeight: "80vh",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           padding: "var(--space-8)",
//           textAlign: "center",
//           position: "relative",
//           overflow: "hidden",
//         }}
//       >
//         <div style={{ maxWidth: "680px", position: "relative", zIndex: 2 }}>
//           <h1
//             style={{
//               fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
//               fontWeight: "var(--font-weight-bold)",
//               letterSpacing: "var(--letter-spacing-tight)",
//               lineHeight: "var(--line-height-tight)",
//               marginBottom: "var(--space-6)",
//               color: "var(--color-text-primary)",
//             }}
//           >
//             Share what you know,{" "}
//             <span style={{ color: "var(--color-accent)" }}>simply.</span>
//           </h1>
//           <p
//             style={{
//               fontSize: "var(--font-size-lg)",
//               color: "var(--color-text-secondary)",
//               lineHeight: "var(--line-height-normal)",
//               marginBottom: "var(--space-8)",
//               maxWidth: "520px",
//               marginLeft: "auto",
//               marginRight: "auto",
//             }}
//           >
//             Confluence is a structured, block-based note-sharing platform.
//             Organise your knowledge, collaborate in real-time, and publish
//             publicly or keep it private.
//           </p>
//           <div
//             style={{
//               display: "flex",
//               gap: "var(--space-4)",
//               justifyContent: "center",
//               flexWrap: "wrap",
//             }}
//           >
//             <Link to="/signup">
//               <Button
//                 variant="primary"
//                 size="lg"
//                 style={{ fontSize: "1rem", padding: "0.8em 2em" }}
//               >
//                 Get started free
//               </Button>
//             </Link>
//             <Link to="/notes">
//               <Button
//                 variant="secondary"
//                 size="lg"
//                 style={{ fontSize: "1rem", padding: "0.8em 2em" }}
//               >
//                 Browse public notes
//               </Button>
//             </Link>
//           </div>
//         </div>
//       </section>

//       {/* Public Folders */}
//       <section
//         style={{
//           padding: "var(--space-16) var(--space-8)",
//           background: "var(--color-bg-subtle)",
//           borderTop: "1px solid var(--color-border)",
//           borderBottom: "1px solid var(--color-border)",
//         }}
//       >
//         <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "space-between",
//               marginBottom: "var(--space-8)",
//             }}
//           >
//             <div>
//               <h2
//                 style={{
//                   fontSize: "var(--font-size-2xl)",
//                   fontWeight: "var(--font-weight-bold)",
//                   margin: 0,
//                 }}
//               >
//                 Public folders
//               </h2>
//               <p
//                 style={{
//                   margin: 0,
//                   color: "var(--color-text-muted)",
//                   fontSize: "var(--font-size-sm)",
//                   marginTop: "var(--space-1)",
//                 }}
//               >
//                 Explore shared knowledge spaces.
//               </p>
//             </div>
//             <Link to="/folders">
//               <Button variant="ghost" size="sm">
//                 View all →
//               </Button>
//             </Link>
//           </div>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
//               gap: "var(--space-4)",
//             }}
//           >
//             {publicFolders.map((folder) => (
//               <Link
//                 key={folder.id}
//                 to={`/folder/${folder.slug}`}
//                 style={{ textDecoration: "none" }}
//               >
//                 <div
//                   style={{
//                     background: "var(--color-bg-elevated)",
//                     border: "1px solid var(--color-border)",
//                     borderRadius: "var(--radius-xl)",
//                     padding: "var(--space-6)",
//                     transition: "all var(--duration-normal)",
//                     boxShadow: "var(--shadow-xs)",
//                   }}
//                   onMouseEnter={(e) => {
//                     e.currentTarget.style.boxShadow = "var(--shadow-md)";
//                     e.currentTarget.style.borderColor =
//                       "var(--color-accent-muted)";
//                   }}
//                   onMouseLeave={(e) => {
//                     e.currentTarget.style.boxShadow = "var(--shadow-xs)";
//                     e.currentTarget.style.borderColor = "var(--color-border)";
//                   }}
//                 >
//                   <h3
//                     style={{
//                       margin: 0,
//                       fontSize: "var(--font-size-md)",
//                       fontWeight: "var(--font-weight-semibold)",
//                       color: "var(--color-text-primary)",
//                     }}
//                   >
//                     {folder.title}
//                   </h3>
//                   {folder.description && (
//                     <p
//                       style={{
//                         margin: "var(--space-2) 0 0",
//                         fontSize: "var(--font-size-sm)",
//                         color: "var(--color-text-secondary)",
//                       }}
//                     >
//                       {folder.description}
//                     </p>
//                   )}
//                   <Badge
//                     variant="accent"
//                     style={{ marginTop: "var(--space-4)" }}
//                   >
//                     {folder.note_count ?? 0} notes
//                   </Badge>
//                 </div>
//               </Link>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Public Notes */}
//       <section style={{ padding: "var(--space-16) var(--space-8)" }}>
//         <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "space-between",
//               marginBottom: "var(--space-8)",
//             }}
//           >
//             <div>
//               <h2
//                 style={{
//                   fontSize: "var(--font-size-2xl)",
//                   fontWeight: "var(--font-weight-bold)",
//                   margin: 0,
//                 }}
//               >
//                 Latest notes
//               </h2>
//               <p
//                 style={{
//                   margin: 0,
//                   color: "var(--color-text-muted)",
//                   fontSize: "var(--font-size-sm)",
//                   marginTop: "var(--space-1)",
//                 }}
//               >
//                 Recently published notes from the community.
//               </p>
//             </div>
//             <Link to="/notes">
//               <Button variant="ghost" size="sm">
//                 View all →
//               </Button>
//             </Link>
//           </div>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
//               gap: "var(--space-4)",
//             }}
//           >
//             {publicNotes.map((note) => (
//               <Link
//                 key={note.id}
//                 to={`/n/${note.slug}`}
//                 style={{ textDecoration: "none" }}
//               >
//                 <div
//                   style={{
//                     background: "var(--color-bg-elevated)",
//                     border: "1px solid var(--color-border)",
//                     borderRadius: "var(--radius-xl)",
//                     padding: "var(--space-6)",
//                     transition: "all var(--duration-normal)",
//                     boxShadow: "var(--shadow-xs)",
//                   }}
//                   onMouseEnter={(e) => {
//                     e.currentTarget.style.boxShadow = "var(--shadow-md)";
//                     e.currentTarget.style.borderColor =
//                       "var(--color-accent-muted)";
//                   }}
//                   onMouseLeave={(e) => {
//                     e.currentTarget.style.boxShadow = "var(--shadow-xs)";
//                     e.currentTarget.style.borderColor = "var(--color-border)";
//                   }}
//                 >
//                   <h3
//                     style={{
//                       margin: 0,
//                       fontSize: "var(--font-size-md)",
//                       fontWeight: "var(--font-weight-semibold)",
//                       color: "var(--color-text-primary)",
//                     }}
//                   >
//                     {note.title}
//                   </h3>
//                   {note.description && (
//                     <p
//                       style={{
//                         margin: "var(--space-2) 0 0",
//                         fontSize: "var(--font-size-sm)",
//                         color: "var(--color-text-secondary)",
//                       }}
//                     >
//                       {note.description}
//                     </p>
//                   )}
//                   <div
//                     style={{
//                       display: "flex",
//                       gap: "var(--space-2)",
//                       marginTop: "var(--space-4)",
//                       flexWrap: "wrap",
//                     }}
//                   >
//                     <Badge variant="muted">{note.folder?.title}</Badge>
//                     <span
//                       style={{
//                         fontSize: "var(--font-size-xs)",
//                         color: "var(--color-text-muted)",
//                         alignSelf: "center",
//                       }}
//                     >
//                       {formatDate(note.updated_at)}
//                     </span>
//                   </div>
//                 </div>
//               </Link>
//             ))}
//           </div>
//         </div>
//       </section>

//       <Footer />
//     </>
//   );
// }

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button, Badge } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function HomePage() {
  const [publicFolders, setPublicFolders] = useState<any[]>([]);
  const [publicNotes, setPublicNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPublicContent = async () => {
      try {
        const supabase = requireSupabase();

        const { data: folders } = await supabase
          .from("folders")
          .select("id, title, description, slug, updated_at, note_count")
          .is("parent_id", null)
          .eq("visibility", "public")
          .order("updated_at", { ascending: false })
          .limit(3);

        const { data: notes } = await supabase
          .from("notes")
          .select(
            "id, title, description, slug, updated_at, visibility, folder:folders(id, title, slug)",
          )
          .eq("visibility", "public")
          .order("updated_at", { ascending: false })
          .limit(3);

        setPublicFolders(folders ?? []);
        setPublicNotes(notes ?? []);
      } catch (err) {
        console.error("Error loading public content:", err);
      } finally {
        setLoading(false);
      }
    };
    void loadPublicContent();
  }, []);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <>
        <Navbar />
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-muted)",
          }}
        >
          Loading…
        </div>
        <Footer />
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section
        style={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: "680px", position: "relative", zIndex: 2 }}>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              fontWeight: "var(--font-weight-bold)",
              letterSpacing: "var(--letter-spacing-tight)",
              lineHeight: "var(--line-height-tight)",
              marginBottom: "var(--space-6)",
              color: "var(--color-text-primary)",
            }}
          >
            Share what you know,{" "}
            <span style={{ color: "var(--color-accent)" }}>simply.</span>
          </h1>
          <p
            style={{
              fontSize: "var(--font-size-lg)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--line-height-normal)",
              marginBottom: "var(--space-8)",
              maxWidth: "520px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Confluence is a structured, block-based note-sharing platform.
            Organise your knowledge, collaborate in real-time, and publish
            publicly or keep it private.
          </p>
          <div
            style={{
              display: "flex",
              gap: "var(--space-4)",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link to="/signup">
              <Button
                variant="primary"
                size="lg"
                style={{ fontSize: "1rem", padding: "0.8em 2em" }}
              >
                Get started free
              </Button>
            </Link>
            <Link to="/notes">
              <Button
                variant="secondary"
                size="lg"
                style={{ fontSize: "1rem", padding: "0.8em 2em" }}
              >
                Browse public notes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Public Folders */}
      <section
        style={{
          padding: "var(--space-16) var(--space-8)",
          background: "var(--color-bg-subtle)",
          borderTop: "1px solid var(--color-border)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--space-8)",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: "var(--font-weight-bold)",
                  margin: 0,
                }}
              >
                Public folders
              </h2>
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                  marginTop: "var(--space-1)",
                }}
              >
                Explore shared knowledge spaces.
              </p>
            </div>
            <Link to="/folders">
              <Button variant="ghost" size="sm">
                View all →
              </Button>
            </Link>
          </div>

          {publicFolders.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {publicFolders.map((folder) => (
                <Link
                  key={folder.id}
                  to={`/folder/${folder.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      background: "var(--color-bg-elevated)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-xl)",
                      padding: "var(--space-6)",
                      transition: "all var(--duration-normal)",
                      boxShadow: "var(--shadow-xs)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "var(--shadow-md)";
                      e.currentTarget.style.borderColor =
                        "var(--color-accent-muted)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                      e.currentTarget.style.borderColor = "var(--color-border)";
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "var(--font-size-md)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {folder.title}
                    </h3>
                    {folder.description && (
                      <p
                        style={{
                          margin: "var(--space-2) 0 0",
                          fontSize: "var(--font-size-sm)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {folder.description}
                      </p>
                    )}
                    <Badge
                      variant="accent"
                      style={{ marginTop: "var(--space-4)" }}
                    >
                      {folder.note_count ?? 0} notes
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "var(--space-12)",
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              No public folders yet. Check back later!
            </div>
          )}
        </div>
      </section>

      {/* Public Notes */}
      <section style={{ padding: "var(--space-16) var(--space-8)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "var(--space-8)",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: "var(--font-weight-bold)",
                  margin: 0,
                }}
              >
                Latest notes
              </h2>
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                  marginTop: "var(--space-1)",
                }}
              >
                Recently published notes from the community.
              </p>
            </div>
            <Link to="/notes">
              <Button variant="ghost" size="sm">
                View all →
              </Button>
            </Link>
          </div>

          {publicNotes.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {publicNotes.map((note) => (
                <Link
                  key={note.id}
                  to={`/n/${note.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      background: "var(--color-bg-elevated)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-xl)",
                      padding: "var(--space-6)",
                      transition: "all var(--duration-normal)",
                      boxShadow: "var(--shadow-xs)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "var(--shadow-md)";
                      e.currentTarget.style.borderColor =
                        "var(--color-accent-muted)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                      e.currentTarget.style.borderColor = "var(--color-border)";
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "var(--font-size-md)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {note.title}
                    </h3>
                    {note.description && (
                      <p
                        style={{
                          margin: "var(--space-2) 0 0",
                          fontSize: "var(--font-size-sm)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {note.description}
                      </p>
                    )}
                    <div
                      style={{
                        display: "flex",
                        gap: "var(--space-2)",
                        marginTop: "var(--space-4)",
                        flexWrap: "wrap",
                      }}
                    >
                      <Badge variant="muted">{note.folder?.title}</Badge>
                      <span
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-muted)",
                          alignSelf: "center",
                        }}
                      >
                        {formatDate(note.updated_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "var(--space-12)",
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              No public notes yet. Check back later!
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
