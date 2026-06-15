import { useMemo } from "react";
import { renderMarkdown } from "@/lib/markdown";
import styles from "@/styles/markdown.module.css";

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  if (!html) {
    return (
      <div
        style={{
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)",
          fontStyle: "italic",
          padding: "var(--space-2) 0",
        }}
      >
        Empty
      </div>
    );
  }

  return (
    <div
      className={styles.markdownPreview}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
