// import { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
// import { Navbar } from "@/components/layout/Navbar";
// import { Footer } from "@/components/layout/Footer";
// import { Badge, EmptyState } from "@/components/ui";
// import { requireSupabase } from "@/lib/supabase";

// export function FoldersPage() {
//   const [loading, setLoading] = useState(true); // eslint-disable-line @typescript-eslint/no-unused-vars
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const [publicFolders, setPublicFolders] = useState<any[]>([]);

//   useEffect(() => {
//     const load = async () => {
//       try {
//         const supabase = requireSupabase();
//         const { data } = await supabase
//           .from("folders")
//           .select("id, title, description, slug, updated_at, note_count")
//           .is("parent_id", null)
//           .eq("visibility", "public")
//           .order("updated_at", { ascending: false });

//         setPublicFolders(data || []);
//       } catch (err) {
//         console.error("Error loading folders:", err);
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
//             Public Folders
//           </h1>
//           <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
//             Browse shared knowledge spaces from the community.
//           </p>
//         </div>

//         {publicFolders.length > 0 ? (
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
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
//                   <div
//                     style={{
//                       display: "flex",
//                       gap: "var(--space-2)",
//                       marginTop: "var(--space-4)",
//                     }}
//                   >
//                     <Badge variant="accent">
//                       {folder.note_count ?? 0} notes
//                     </Badge>
//                   </div>
//                 </div>
//               </Link>
//             ))}
//           </div>
//         ) : (
//           <EmptyState
//             icon="📁"
//             title="No public folders yet"
//             description="Check back later when users publish folders."
//           />
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
import { Badge, EmptyState } from "@/components/ui";
import { requireSupabase } from "@/lib/supabase";

export function FoldersPage() {
  const [loading, setLoading] = useState(true);
  const [publicFolders, setPublicFolders] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = requireSupabase();
        const { data } = await supabase
          .from("folders")
          .select("id, title, description, slug, updated_at, note_count")
          .is("parent_id", null)
          .eq("visibility", "public")
          .order("updated_at", { ascending: false });

        setPublicFolders(data ?? []);
      } catch (err) {
        console.error("Error loading folders:", err);
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
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-muted)",
          }}
        >
          Loading folders…
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
            Public Folders
          </h1>
          <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
            Browse shared knowledge spaces from the community.
          </p>
        </div>

        {publicFolders.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
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
                  <div
                    style={{
                      display: "flex",
                      gap: "var(--space-2)",
                      marginTop: "var(--space-4)",
                    }}
                  >
                    <Badge variant="accent">
                      {folder.note_count ?? 0} notes
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📁"
            title="No public folders yet"
            description="Check back later when users publish folders."
          />
        )}
      </div>
      <Footer />
    </>
  );
}
