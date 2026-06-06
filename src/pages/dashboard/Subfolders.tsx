// import { useState, useEffect } from "react";
// import { DashboardLayout } from "@/components/layout/DashboardLayout";
// import { Icon } from "@/components/layout/DashboardIcon";
// import { IC } from "@/components/layout/dashboardIconPaths";
// import { Button, EmptyState, Input, Badge } from "@/components/ui";
// import { useAuth, fallbackProfile } from "@/context/auth";
// import { requireSupabase } from "@/lib/supabase";
// import { ShareModal } from "@/components/ShareModal";
// import type { Folder, Visibility } from "@/types";

// function formatDate(iso: string) {
//   return new Date(iso).toLocaleDateString("en-US", {
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// }

// export function DashboardSubfolders() {
//   const { profile } = useAuth();
//   const user = profile;

//   const [loading, setLoading] = useState(true);
//   const [foldersList, setFoldersList] = useState<Folder[]>([]);
//   const [notesList, setNotesList] = useState<any[]>([]);
//   const [search, setSearch] = useState("");
//   const [shareItem, setShareItem] = useState<Folder | null>(null);

//   // Creation State
//   const [isCreateOpen, setIsCreateOpen] = useState(false);
//   const [newTitle, setNewTitle] = useState("");
//   const [newDesc, setNewDesc] = useState("");
//   const [parentId, setParentId] = useState("");
//   const [newVisibility, setNewVisibility] = useState<Visibility>("public"); // default public!

//   const loadData = async () => {
//     if (!user) return;
//     try {
//       const supabase = requireSupabase();
//       const { data: folders, error: foldersErr } = await supabase
//         .from("folders")
//         .select("*")
//         .eq("owner_id", user.id);

//       const { data: notes, error: notesErr } = await supabase
//         .from("notes")
//         .select("id, folder_id")
//         .eq("owner_id", user.id);

//       if (foldersErr) throw foldersErr;
//       if (notesErr) throw notesErr;

//       setFoldersList(folders || []);
//       setNotesList(notes || []);
//     } catch (err) {
//       console.error("Error fetching folders:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     void loadData();
//   }, [user]);

//   const rootFolders = foldersList.filter((f) => f.parent_id === null);

//   // Flatten all subfolders with their parent details
//   const allSubfolders = foldersList
//     .filter((f) => f.parent_id !== null)
//     .map((sf) => {
//       const parent = rootFolders.find((rf) => rf.id === sf.parent_id);
//       const noteCount = notesList.filter((n) => n.folder_id === sf.id).length;
//       return {
//         ...sf,
//         parentTitle: parent ? parent.title : "Unknown Parent",
//         parentSlug: parent ? parent.slug : "",
//         note_count: noteCount,
//       };
//     });

//   const filtered = allSubfolders.filter((sf) => {
//     const q = search.toLowerCase();
//     return (
//       sf.title.toLowerCase().includes(q) ||
//       sf.parentTitle.toLowerCase().includes(q)
//     );
//   });

//   const handleCreateSubfolder = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!newTitle.trim() || !parentId || !user) return;

//     const slug = newTitle
//       .toLowerCase()
//       .replace(/[^a-z0-9]+/g, "-")
//       .replace(/^-|-$/g, "");

//     try {
//       const supabase = requireSupabase();
//       const { error } = await supabase.from("folders").insert({
//         owner_id: user.id,
//         parent_id: parentId,
//         title: newTitle.trim(),
//         description: newDesc.trim() || null,
//         slug,
//         visibility: newVisibility,
//       });

//       if (error) throw error;

//       await loadData();
//       setIsCreateOpen(false);
//       setNewTitle("");
//       setNewDesc("");
//       setParentId("");
//       setNewVisibility("public");
//     } catch (err) {
//       console.error("Error creating subfolder:", err);
//     }
//   };

//   const handleDeleteSubfolder = async (id: string) => {
//     if (
//       !confirm(
//         "Are you sure you want to delete this subfolder and all its notes?",
//       )
//     )
//       return;
//     try {
//       const supabase = requireSupabase();
//       const { error } = await supabase.from("folders").delete().eq("id", id);

//       if (error) throw error;
//       await loadData();
//     } catch (err) {
//       console.error("Error deleting subfolder:", err);
//     }
//   };

//   if (!user || loading) {
//     return (
//       <DashboardLayout
//         user={
//           user || {
//             id: "",
//             full_name: "Loading...",
//             avatar_url: null,
//             user_type: "user",
//             created_at: "",
//           }
//         }
//         variant="user"
//       >
//         <div
//           style={{
//             padding: "var(--space-20)",
//             textAlign: "center",
//             color: "var(--color-text-muted)",
//           }}
//         >
//           Loading subfolders…
//         </div>
//       </DashboardLayout>
//     );
//   }

//   return (
//     <DashboardLayout user={user} variant="user">
//       <div
//         style={{
//           display: "flex",
//           alignItems: "flex-start",
//           justifyContent: "space-between",
//           marginBottom: "var(--space-6)",
//           flexWrap: "wrap",
//           gap: "var(--space-4)",
//         }}
//       >
//         <div>
//           <h1
//             style={{
//               fontSize: "var(--font-size-2xl)",
//               fontWeight: "var(--font-weight-bold)",
//               letterSpacing: "var(--letter-spacing-tight)",
//               marginBottom: "var(--space-1)",
//             }}
//           >
//             Subfolders
//           </h1>
//           <p
//             style={{
//               margin: 0,
//               color: "var(--color-text-muted)",
//               fontSize: "var(--font-size-sm)",
//             }}
//           >
//             {allSubfolders.length} subfolder
//             {allSubfolders.length !== 1 ? "s" : ""} across all folders
//           </p>
//         </div>
//         <Button
//           variant="primary"
//           size="sm"
//           onClick={() => setIsCreateOpen(true)}
//           leftIcon={<Icon d={IC.plus} size={14} />}
//         >
//           New subfolder
//         </Button>
//       </div>

//       {/* Search */}
//       <div style={{ marginBottom: "var(--space-6)" }}>
//         <input
//           type="search"
//           placeholder="Search subfolders or parent folder…"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           style={{
//             width: "100%",
//             maxWidth: "400px",
//             fontFamily: "var(--font-sans)",
//             fontSize: "var(--font-size-sm)",
//             color: "var(--color-text-primary)",
//             background: "var(--color-bg-elevated)",
//             border: "1px solid var(--color-border)",
//             borderRadius: "var(--radius-md)",
//             padding: "var(--space-2) var(--space-3)",
//             outline: "none",
//           }}
//           onFocus={(e) => {
//             e.currentTarget.style.borderColor = "var(--color-accent)";
//             e.currentTarget.style.boxShadow =
//               "0 0 0 3px var(--color-accent-subtle)";
//           }}
//           onBlur={(e) => {
//             e.currentTarget.style.borderColor = "var(--color-border)";
//             e.currentTarget.style.boxShadow = "none";
//           }}
//         />
//       </div>

//       {filtered.length > 0 ? (
//         <div
//           style={{
//             background: "var(--color-bg-elevated)",
//             border: "1px solid var(--color-border)",
//             borderRadius: "var(--radius-xl)",
//             overflow: "hidden",
//           }}
//         >
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "1fr 180px 80px 100px 120px 140px",
//               gap: "var(--space-4)",
//               padding: "var(--space-3) var(--space-5)",
//               borderBottom: "1px solid var(--color-border)",
//               background: "var(--color-bg-subtle)",
//             }}
//           >
//             {[
//               "Subfolder",
//               "Parent folder",
//               "Notes",
//               "Visibility",
//               "Updated",
//               "Actions",
//             ].map((h) => (
//               <span
//                 key={h}
//                 style={{
//                   fontSize: "11px",
//                   fontWeight: "var(--font-weight-semibold)",
//                   letterSpacing: "0.07em",
//                   textTransform: "uppercase",
//                   color: "var(--color-text-muted)",
//                 }}
//               >
//                 {h}
//               </span>
//             ))}
//           </div>

//           {filtered.map((sf, i) => (
//             <div
//               key={sf.id}
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "1fr 180px 80px 100px 120px 140px",
//                 gap: "var(--space-4)",
//                 alignItems: "center",
//                 padding: "var(--space-4) var(--space-5)",
//                 borderBottom:
//                   i < filtered.length - 1
//                     ? "1px solid var(--color-border-subtle)"
//                     : "none",
//                 transition: "background var(--duration-fast)",
//               }}
//               onMouseEnter={(e) =>
//                 (e.currentTarget.style.background = "var(--color-bg-subtle)")
//               }
//               onMouseLeave={(e) =>
//                 (e.currentTarget.style.background = "transparent")
//               }
//             >
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "var(--space-3)",
//                   minWidth: 0,
//                 }}
//               >
//                 <div
//                   style={{
//                     width: "34px",
//                     height: "34px",
//                     borderRadius: "var(--radius-lg)",
//                     background: "var(--color-bg-muted)",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                     color: "var(--color-text-secondary)",
//                     flexShrink: 0,
//                   }}
//                 >
//                   <Icon d={IC.subfolder} size={16} />
//                 </div>
//                 <div style={{ minWidth: 0 }}>
//                   <p
//                     style={{
//                       margin: 0,
//                       fontSize: "var(--font-size-sm)",
//                       fontWeight: "var(--font-weight-semibold)",
//                       color: "var(--color-text-primary)",
//                       overflow: "hidden",
//                       textOverflow: "ellipsis",
//                       whiteSpace: "nowrap",
//                     }}
//                   >
//                     {sf.title}
//                   </p>
//                   {sf.description && (
//                     <p
//                       style={{
//                         margin: 0,
//                         fontSize: "var(--font-size-xs)",
//                         color: "var(--color-text-muted)",
//                         overflow: "hidden",
//                         textOverflow: "ellipsis",
//                         whiteSpace: "nowrap",
//                       }}
//                     >
//                       {sf.description}
//                     </p>
//                   )}
//                 </div>
//               </div>
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: "var(--space-2)",
//                 }}
//               >
//                 <Icon d={IC.folder} size={13} />
//                 <span
//                   style={{
//                     fontSize: "var(--font-size-xs)",
//                     color: "var(--color-text-secondary)",
//                     overflow: "hidden",
//                     textOverflow: "ellipsis",
//                     whiteSpace: "nowrap",
//                   }}
//                 >
//                   {sf.parentTitle}
//                 </span>
//               </div>
//               <span
//                 style={{
//                   fontSize: "var(--font-size-sm)",
//                   color: "var(--color-text-secondary)",
//                 }}
//               >
//                 {sf.note_count ?? 0}
//               </span>
//               <Badge variant={sf.visibility === "public" ? "accent" : "muted"}>
//                 {sf.visibility}
//               </Badge>
//               <span
//                 style={{
//                   fontSize: "var(--font-size-xs)",
//                   color: "var(--color-text-muted)",
//                 }}
//               >
//                 {formatDate(sf.updated_at)}
//               </span>
//               <div style={{ display: "flex", gap: "var(--space-2)" }}>
//                 {sf.visibility === "private" && (
//                   <Button
//                     variant="accent-ghost"
//                     size="xs"
//                     onClick={() => setShareItem(sf as Folder)}
//                   >
//                     Share
//                   </Button>
//                 )}
//                 <Button
//                   variant="danger"
//                   size="xs"
//                   onClick={() => handleDeleteSubfolder(sf.id)}
//                 >
//                   Delete
//                 </Button>
//               </div>
//             </div>
//           ))}
//         </div>
//       ) : (
//         <EmptyState
//           icon="📂"
//           title="No subfolders found"
//           description="Add subfolders inside your folders to organise notes further."
//           action={
//             <Button
//               variant="primary"
//               size="sm"
//               onClick={() => setIsCreateOpen(true)}
//               leftIcon={<Icon d={IC.plus} size={14} />}
//             >
//               New subfolder
//             </Button>
//           }
//         />
//       )}

//       {/* Creation Modal */}
//       {isCreateOpen && (
//         <>
//           <div
//             onClick={() => setIsCreateOpen(false)}
//             style={{
//               position: "fixed",
//               inset: 0,
//               background: "rgba(0,0,0,0.5)",
//               zIndex: 200,
//               backdropFilter: "blur(2px)",
//             }}
//           />
//           <div
//             style={{
//               position: "fixed",
//               top: "50%",
//               left: "50%",
//               transform: "translate(-50%,-50%)",
//               zIndex: 201,
//               background: "var(--color-bg-elevated)",
//               border: "1px solid var(--color-border)",
//               borderRadius: "var(--radius-xl)",
//               padding: "var(--space-8)",
//               width: "400px",
//               boxShadow: "var(--shadow-xl)",
//             }}
//           >
//             <h3
//               style={{
//                 marginBottom: "var(--space-4)",
//                 fontSize: "var(--font-size-lg)",
//                 fontWeight: "var(--font-weight-bold)",
//               }}
//             >
//               New Subfolder
//             </h3>
//             <form
//               onSubmit={handleCreateSubfolder}
//               style={{
//                 display: "flex",
//                 flexDirection: "column",
//                 gap: "var(--space-4)",
//               }}
//             >
//               <Input
//                 label="Subfolder Title *"
//                 placeholder="My new subfolder"
//                 value={newTitle}
//                 onChange={(e) => setNewTitle(e.target.value)}
//                 required
//               />

//               <div
//                 style={{
//                   display: "flex",
//                   flexDirection: "column",
//                   gap: "var(--space-2)",
//                 }}
//               >
//                 <label
//                   style={{
//                     fontSize: "var(--font-size-sm)",
//                     fontWeight: "var(--font-weight-medium)",
//                   }}
//                 >
//                   Parent Folder *
//                 </label>
//                 <select
//                   value={parentId}
//                   onChange={(e) => setParentId(e.target.value)}
//                   required
//                   style={{
//                     width: "100%",
//                     fontFamily: "var(--font-sans)",
//                     fontSize: "var(--font-size-sm)",
//                     color: "var(--color-text-primary)",
//                     background: "var(--color-bg-elevated)",
//                     border: "1px solid var(--color-border)",
//                     borderRadius: "var(--radius-md)",
//                     padding: "10px var(--space-3)",
//                     outline: "none",
//                     cursor: "pointer",
//                   }}
//                 >
//                   <option value="" disabled>
//                     Select a root folder…
//                   </option>
//                   {rootFolders.map((f) => (
//                     <option key={f.id} value={f.id}>
//                       📁 {f.title}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <Input
//                 label="Description"
//                 placeholder="A short description of this subfolder"
//                 value={newDesc}
//                 onChange={(e) => setNewDesc(e.target.value)}
//               />

//               <div
//                 style={{
//                   display: "flex",
//                   flexDirection: "column",
//                   gap: "var(--space-2)",
//                 }}
//               >
//                 <label
//                   style={{
//                     fontSize: "var(--font-size-sm)",
//                     fontWeight: "var(--font-weight-medium)",
//                   }}
//                 >
//                   Visibility
//                 </label>
//                 <div
//                   style={{
//                     display: "flex",
//                     gap: "var(--space-3)",
//                     background: "var(--color-bg-subtle)",
//                     border: "1px solid var(--color-border)",
//                     borderRadius: "var(--radius-lg)",
//                     padding: "4px",
//                     width: "fit-content",
//                   }}
//                 >
//                   <button
//                     type="button"
//                     onClick={() => setNewVisibility("public")}
//                     style={{
//                       padding: "6px 12px",
//                       border: "none",
//                       background:
//                         newVisibility === "public"
//                           ? "var(--color-accent-subtle)"
//                           : "transparent",
//                       color:
//                         newVisibility === "public"
//                           ? "var(--color-accent)"
//                           : "var(--color-text-muted)",
//                       borderRadius: "var(--radius-md)",
//                       cursor: "pointer",
//                       fontSize: "var(--font-size-sm)",
//                       fontWeight: "var(--font-weight-medium)",
//                     }}
//                   >
//                     🌎 Public
//                   </button>
//                   <button
//                     type="button"
//                     onClick={() => setNewVisibility("private")}
//                     style={{
//                       padding: "6px 12px",
//                       border: "none",
//                       background:
//                         newVisibility === "private"
//                           ? "var(--color-accent-subtle)"
//                           : "transparent",
//                       color:
//                         newVisibility === "private"
//                           ? "var(--color-accent)"
//                           : "var(--color-text-muted)",
//                       borderRadius: "var(--radius-md)",
//                       cursor: "pointer",
//                       fontSize: "var(--font-size-sm)",
//                       fontWeight: "var(--font-weight-medium)",
//                     }}
//                   >
//                     🔒 Private
//                   </button>
//                 </div>
//               </div>

//               <div
//                 style={{
//                   display: "flex",
//                   gap: "var(--space-3)",
//                   justifyContent: "flex-end",
//                   marginTop: "var(--space-4)",
//                 }}
//               >
//                 <Button
//                   type="button"
//                   variant="secondary"
//                   size="sm"
//                   onClick={() => setIsCreateOpen(false)}
//                 >
//                   Cancel
//                 </Button>
//                 <Button type="submit" variant="primary" size="sm">
//                   Create Subfolder
//                 </Button>
//               </div>
//             </form>
//           </div>
//         </>
//       )}

//       {/* Share Modal */}
//       {shareItem && (
//         <ShareModal
//           isOpen={!!shareItem}
//           onClose={() => setShareItem(null)}
//           itemId={shareItem.id}
//           itemTitle={shareItem.title}
//           itemType="folder"
//           itemSlug={shareItem.slug}
//         />
//       )}
//     </DashboardLayout>
//   );
// }

import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Icon } from "@/components/layout/DashboardIcon";
import { IC } from "@/components/layout/dashboardIconPaths";
import { Button, EmptyState, Input, Badge } from "@/components/ui";
import { useAuth, fallbackProfile } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";
import { ShareModal } from "@/components/ShareModal";
import type { Folder, Visibility } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubfolderRow extends Folder {
  parentTitle: string;
  parentSlug: string;
  derivedNoteCount: number; // renamed to avoid collision with any DB field
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const DEFAULT_VISIBILITY: Visibility = "public";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardSubfolders() {
  const { profile } = useAuth();
  const user = profile;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [foldersList, setFoldersList] = useState<Folder[]>([]);
  const [notesList, setNotesList] = useState<
    { id: string; folder_id: string }[]
  >([]);
  const [search, setSearch] = useState("");
  const [shareItem, setShareItem] = useState<Folder | null>(null);

  // Creation state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [parentId, setParentId] = useState("");
  const [newVisibility, setNewVisibility] =
    useState<Visibility>(DEFAULT_VISIBILITY);

  // Delete confirmation state (replaces blocking window.confirm)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data loading — wrapped in useCallback so it can be a stable dep
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const supabase = requireSupabase();

      const [
        { data: folders, error: foldersErr },
        { data: notes, error: notesErr },
      ] = await Promise.all([
        supabase.from("folders").select("*").eq("owner_id", user.id),
        supabase.from("notes").select("id, folder_id").eq("owner_id", user.id),
      ]);

      if (foldersErr) throw foldersErr;
      if (notesErr) throw notesErr;

      setFoldersList(folders ?? []);
      setNotesList(notes ?? []);
    } catch (err) {
      console.error("Error fetching folders:", err);
      setError("Failed to load subfolders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Derived data — memoised to avoid re-computation every render
  // ---------------------------------------------------------------------------

  const rootFolders = useMemo(
    () => foldersList.filter((f) => f.parent_id === null),
    [foldersList],
  );

  const allSubfolders = useMemo<SubfolderRow[]>(() => {
    // Build a quick lookup for all folders (supports arbitrary depth)
    const byId = new Map(foldersList.map((f) => [f.id, f]));

    return foldersList
      .filter((f) => f.parent_id !== null)
      .map((sf) => {
        const parent = sf.parent_id ? byId.get(sf.parent_id) : undefined;
        const derivedNoteCount = notesList.filter(
          (n) => n.folder_id === sf.id,
        ).length;
        return {
          ...sf,
          parentTitle: parent?.title ?? "Unknown Parent",
          parentSlug: parent?.slug ?? "",
          derivedNoteCount,
        };
      });
  }, [foldersList, notesList]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allSubfolders;
    return allSubfolders.filter(
      (sf) =>
        sf.title.toLowerCase().includes(q) ||
        sf.parentTitle.toLowerCase().includes(q),
    );
  }, [allSubfolders, search]);

  // ---------------------------------------------------------------------------
  // Modal helpers
  // ---------------------------------------------------------------------------

  const resetAndClose = useCallback(() => {
    setIsCreateOpen(false);
    setNewTitle("");
    setNewDesc("");
    setParentId("");
    setNewVisibility(DEFAULT_VISIBILITY);
  }, []);

  // ---------------------------------------------------------------------------
  // CRUD handlers
  // ---------------------------------------------------------------------------

  const handleCreateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !parentId || !user) return;

    const slug = buildSlug(newTitle);

    try {
      const supabase = requireSupabase();
      const { error: insertErr } = await supabase.from("folders").insert({
        owner_id: user.id,
        parent_id: parentId,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        slug,
        visibility: newVisibility,
      });

      if (insertErr) throw insertErr;

      await loadData();
      resetAndClose();
    } catch (err: any) {
      console.error("Error creating subfolder:", err);
      // Surface slug uniqueness conflicts clearly
      const msg =
        err?.code === "23505"
          ? "A subfolder with this title already exists. Please choose a different name."
          : "Failed to create subfolder. Please try again.";
      setError(msg);
    }
  };

  const handleDeleteSubfolder = async (id: string) => {
    try {
      const supabase = requireSupabase();
      const { error: deleteErr } = await supabase
        .from("folders")
        .delete()
        .eq("id", id);
      if (deleteErr) throw deleteErr;
      await loadData();
    } catch (err) {
      console.error("Error deleting subfolder:", err);
      setError("Failed to delete subfolder. Please try again.");
    } finally {
      setPendingDeleteId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Render — loading / auth guard
  // ---------------------------------------------------------------------------

  if (!user || loading) {
    return (
      <DashboardLayout
        user={
          user ?? fallbackProfile()
        }
        variant="user"
      >
        <div
          style={{
            padding: "var(--space-20)",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          Loading subfolders…
        </div>
      </DashboardLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — main
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout user={user} variant="user">
      {/* Error banner */}
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: "var(--space-4)",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--color-danger-subtle)",
            border: "1px solid var(--color-danger)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-danger)",
            fontSize: "var(--font-size-sm)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              fontSize: "var(--font-size-base)",
              lineHeight: 1,
            }}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
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
            Subfolders
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {allSubfolders.length} subfolder
            {allSubfolders.length !== 1 ? "s" : ""} across all folders
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Icon d={IC.plus} size={14} />}
        >
          New subfolder
        </Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <input
          type="search"
          placeholder="Search subfolders or parent folder…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "400px",
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
      </div>

      {/* Table */}
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
              gridTemplateColumns: "1fr 180px 80px 100px 120px 140px",
              gap: "var(--space-4)",
              padding: "var(--space-3) var(--space-5)",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-bg-subtle)",
            }}
          >
            {[
              "Subfolder",
              "Parent folder",
              "Notes",
              "Visibility",
              "Updated",
              "Actions",
            ].map((h) => (
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

          {filtered.map((sf, i) => (
            <div
              key={sf.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 180px 80px 100px 120px 140px",
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
              {/* Title + description */}
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
                    width: "34px",
                    height: "34px",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--color-bg-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-text-secondary)",
                    flexShrink: 0,
                  }}
                >
                  <Icon d={IC.subfolder} size={16} />
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
                    {sf.title}
                  </p>
                  {sf.description && (
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
                      {sf.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Parent folder */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                <Icon d={IC.folder} size={13} />
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sf.parentTitle}
                </span>
              </div>

              {/* Note count */}
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {sf.derivedNoteCount}
              </span>

              {/* Visibility */}
              <Badge variant={sf.visibility === "public" ? "accent" : "muted"}>
                {sf.visibility}
              </Badge>

              {/* Updated date */}
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                }}
              >
                {formatDate(sf.updated_at)}
              </span>

              {/* Actions */}
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {/* Share is shown for PRIVATE folders (to invite collaborators) */}
                {sf.visibility === "private" && (
                  <Button
                    variant="accent-ghost"
                    size="xs"
                    onClick={() => setShareItem(sf as Folder)}
                  >
                    Share
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="xs"
                  onClick={() => setPendingDeleteId(sf.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="📂"
          title="No subfolders found"
          description="Add subfolders inside your folders to organise notes further."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<Icon d={IC.plus} size={14} />}
            >
              New subfolder
            </Button>
          }
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Create modal                                                        */}
      {/* ------------------------------------------------------------------ */}
      {isCreateOpen && (
        <>
          <div
            onClick={resetAndClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 200,
              backdropFilter: "blur(2px)",
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-subfolder-title"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 201,
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              padding: "var(--space-8)",
              width: "400px",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <h3
              id="create-subfolder-title"
              style={{
                marginBottom: "var(--space-4)",
                fontSize: "var(--font-size-lg)",
                fontWeight: "var(--font-weight-bold)",
              }}
            >
              New Subfolder
            </h3>
            <form
              onSubmit={handleCreateSubfolder}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
              <Input
                label="Subfolder Title *"
                placeholder="My new subfolder"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <label
                  htmlFor="parent-folder-select"
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                  }}
                >
                  Parent Folder *
                </label>
                <select
                  id="parent-folder-select"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-primary)",
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px var(--space-3)",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="" disabled>
                    Select a root folder…
                  </option>
                  {rootFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.title}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Description"
                placeholder="A short description of this subfolder"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <label
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                  }}
                >
                  Visibility
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-3)",
                    background: "var(--color-bg-subtle)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "4px",
                    width: "fit-content",
                  }}
                >
                  {(["public", "private"] as Visibility[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setNewVisibility(v)}
                      style={{
                        padding: "6px 12px",
                        border: "none",
                        background:
                          newVisibility === v
                            ? "var(--color-accent-subtle)"
                            : "transparent",
                        color:
                          newVisibility === v
                            ? "var(--color-accent)"
                            : "var(--color-text-muted)",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-medium)",
                      }}
                    >
                      {v === "public" ? "🌎 Public" : "🔒 Private"}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "var(--space-3)",
                  justifyContent: "flex-end",
                  marginTop: "var(--space-4)",
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={resetAndClose}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Create Subfolder
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Delete confirmation modal (replaces window.confirm)                */}
      {/* ------------------------------------------------------------------ */}
      {pendingDeleteId && (
        <>
          <div
            onClick={() => setPendingDeleteId(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 200,
              backdropFilter: "blur(2px)",
            }}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 201,
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              padding: "var(--space-8)",
              width: "360px",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <h3
              id="delete-confirm-title"
              style={{
                marginBottom: "var(--space-2)",
                fontSize: "var(--font-size-lg)",
                fontWeight: "var(--font-weight-bold)",
              }}
            >
              Delete subfolder?
            </h3>
            <p
              style={{
                marginBottom: "var(--space-6)",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
              }}
            >
              This will permanently delete the subfolder and all its notes. This
              action cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: "var(--space-3)",
                justifyContent: "flex-end",
              }}
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPendingDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => handleDeleteSubfolder(pendingDeleteId)}
              >
                Delete
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Share modal                                                         */}
      {/* ------------------------------------------------------------------ */}
      {shareItem && (
        <ShareModal
          isOpen={!!shareItem}
          onClose={() => setShareItem(null)}
          itemId={shareItem.id}
          itemTitle={shareItem.title}
          itemType="folder"
          itemSlug={shareItem.slug}
        />
      )}
    </DashboardLayout>
  );
}
