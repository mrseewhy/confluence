import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui";
import { NoteEditor, SaveIndicator } from "@/components/editor/NoteEditor";
import { useNoteEditor } from "@/hooks/useNoteEditor";
import { useAuth } from "@/context/auth";

export function CreateNote() {
  const { profile } = useAuth();
  const user = profile;
  const navigate = useNavigate();

  const editor = useNoteEditor();

  const [folderError, setFolderError] = useState("");

  async function handleSave(asDraft: boolean) {
    if (!editor.state.folder_id) {
      setFolderError("Please select a folder.");
      return;
    }
    if (!user) return;
    setFolderError("");
    try {
      await editor.save(user.id, asDraft);
      navigate("/dashboard/notes");
    } catch (err) {
      console.error("[CreateNote] save failed", err);
    }
  }

  if (!user) {
    return (
      <DashboardLayout
        user={{
          id: "",
          full_name: "Loading...",
          avatar_url: null,
          user_type: "user",
          created_at: "",
        }}
        variant="user"
        defaultCollapsed
      >
        <div
          style={{
            padding: "var(--space-20)",
            textAlign: "center",
            color: "var(--color-text-muted)",
          }}
        >
          Loading editor…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} variant="user" defaultCollapsed>
      <NoteEditor
        state={editor.state}
        actions={editor}
        folderError={folderError}
        onFolderChange={(id) => {
          editor.setFolderId(id);
          setFolderError("");
        }}
        breadcrumbLabel="New note"
        headerActions={
          <>
            <SaveIndicator status={editor.saveStatus} message={editor.saveError} />
            <Button
              variant="secondary"
              size="sm"
              disabled={!editor.isValid || editor.saveStatus === "saving"}
              onClick={() => handleSave(true)}
            >
              Save draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!editor.isValid || editor.saveStatus === "saving"}
              onClick={() => handleSave(false)}
            >
              Publish
            </Button>
          </>
        }
        bottomActions={
          <>
            <SaveIndicator status={editor.saveStatus} message={editor.saveError} />
            <Button
              variant="secondary"
              size="sm"
              disabled={!editor.isValid || editor.saveStatus === "saving"}
              onClick={() => handleSave(true)}
            >
              Save draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!editor.isValid || editor.saveStatus === "saving"}
              onClick={() => handleSave(false)}
            >
              Publish
            </Button>
          </>
        }
      />
    </DashboardLayout>
  );
}
