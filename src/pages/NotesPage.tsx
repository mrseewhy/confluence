// import { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
// import { Navbar } from "@/components/layout/Navbar";
// import { Footer } from "@/components/layout/Footer";
// import { Badge } from "@/components/ui";
// import { requireSupabase } from "@/lib/supabase";

// function formatDate(iso: string) {
//   return new Date(iso).toLocaleDateString("en-US", {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// }

// export function NotesPage() {
//   const [loading, setLoading] = useState(true); // eslint-disable-line @typescript-eslint/no-unused-vars
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const [publicNotes, setPublicNotes] = useState<any[]>([]);

//   useEffect(() => {
//     const load = async () => {
//       try {
//         const supabase = requireSupabase();
//         const { data } = await supabase
//           .from("notes")
//           .select(
//             "id, title, description, slug, updated_at, visibility, folder:folders(id, title, slug)",
//           )
//           .eq("visibility", "public")
//           .order("updated_at", { ascending: false });

//         setPublicNotes(data || []);
//       } catch (err) {
//         console.error("Error loading notes:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     void load();
//   }, []);

//   return (
//     <>
//       <Navbar />
//       <div
//         style={{
//           maxWidth: "900px",
//           margin: "0 auto",
//           padding: "var(--space-16) var(--space-8)",
//         }}
//       >
//         <div style={{ marginBottom: "var(--space-8)" }}>
//           <h1
//             style={{
//               fontSize: "var(--font-size-3xl)",
//               fontWeight: "var(--font-weight-bold)",
//               marginBottom: "var(--space-2)",
//             }}
//           >
//             Public Notes
//           </h1>
//           <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
//             Browse publicly shared notes from the community.
//           </p>
//         </div>

//         {publicNotes.length > 0 ? (
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
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
//                   }}
//                   onMouseEnter={(e) => {
//                     e.currentTarget.style.boxShadow = "var(--shadow-md)";
//                     e.currentTarget.style.borderColor =
//                       "var(--color-accent-muted)";
//                   }}
//                   onMouseLeave={(e) => {
//                     e.currentTarget.style.boxShadow = "none";
//                     e.currentTarget.style.borderColor = "var(--color-border)";
//                   }}
//                 >
//                   <h3
//                     style={{
//                       margin: 0,
//                       fontSize: "var(--font-size-md)",
//                       fontWeight: "var(--font-weight-semibold)",
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
//         ) : (
//           <div
//             style={{
//               textAlign: "center",
//               padding: "var(--space-20)",
//               color: "var(--color-text-muted)",
//             }}
//           >
//             <p style={{ fontSize: "40px", marginBottom: "var(--space-4)" }}>
//               📝
//             </p>
//             <p>No public notes yet. Check back later!</p>
//           </div>
//         )}
//       </div>
//       <Footer />
//     </>
//   );
// }

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function NotesPage() {
  const [loading, setLoading] = useState(true);
  const [publicNotes, setPublicNotes] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = requireSupabase();
        const { data } = await supabase
          .from("notes")
          .select(
            "id, title, description, slug, updated_at, visibility, folder:folders(id, title, slug)",
          )
          .eq("visibility", "public")
          .order("updated_at", { ascending: false });

        setPublicNotes(data ?? []);
      } catch (err) {
        console.error("Error loading notes:", err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

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
          Loading notes…
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
        <div style={{ marginBottom: "var(--space-8)" }}>
          <h1
            style={{
              fontSize: "var(--font-size-3xl)",
              fontWeight: "var(--font-weight-bold)",
              marginBottom: "var(--space-2)",
            }}
          >
            Public Notes
          </h1>
          <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
            Browse publicly shared notes from the community.
          </p>
        </div>

        {publicNotes.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
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
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                    e.currentTarget.style.borderColor =
                      "var(--color-accent-muted)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "var(--color-border)";
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "var(--font-size-md)",
                      fontWeight: "var(--font-weight-semibold)",
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
              padding: "var(--space-20)",
              color: "var(--color-text-muted)",
            }}
          >
            <p style={{ fontSize: "40px", marginBottom: "var(--space-4)" }}>
              📝
            </p>
            <p>No public notes yet. Check back later!</p>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
