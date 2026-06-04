import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";
import { requireSupabase } from "@/lib/supabase";

interface FolderSelectProps {
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

export function FolderSelect({ value, onChange, error }: FolderSelectProps) {
  const { profile } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      try {
        const supabase = requireSupabase();
        const { data } = await supabase
          .from("folders")
          .select("id, title, parent_id")
          .eq("owner_id", profile.id)
          .is("parent_id", null);

        setFolders(data || []);
      } catch (err) {
        console.error("Error loading folders:", err);
      }
    };
    void load();
  }, [profile]);

  return (
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
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-sans)",
        }}
      >
        Folder
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-primary)",
          background: "var(--color-bg-elevated)",
          border: `1px solid ${error ? "var(--color-danger)" : "var(--color-border)"}`,
          borderRadius: "var(--radius-md)",
          padding: "10px var(--space-3)",
          outline: "none",
          cursor: "pointer",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-accent)";
          e.currentTarget.style.boxShadow =
            "0 0 0 3px var(--color-accent-subtle)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error
            ? "var(--color-danger)"
            : "var(--color-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <option value="" disabled>
          Select a folder…
        </option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            📁 {f.title}
          </option>
        ))}
      </select>
      {error && (
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-danger)",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
