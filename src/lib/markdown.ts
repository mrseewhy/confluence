import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Render markdown string to safe HTML.
 * Sanitizes output through DOMPurify to prevent XSS attacks
 * from malicious markdown content (e.g. `<img onerror=alert(1)>`).
 */
export function renderMarkdown(input: string): string {
  if (!input.trim()) return "";
  const raw = marked.parse(input, { async: false }) as string;
  return DOMPurify.sanitize(raw);
}
