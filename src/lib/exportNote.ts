import type { Note, NoteBlock } from '@/types'

/**
 * Export formats supported for a note.
 */
export type ExportFormat = 'markdown' | 'html' | 'json'

export interface ExportPayload {
  filename: string
  mimeType: string
  content: string
}

/**
 * Build a filesystem-safe filename base from a note title.
 */
function slugifyFilename(title: string): string {
  const base = (title || 'untitled')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return base || 'untitled'
}

// ── Markdown ─────────────────────────────────────────────────

function blockToMarkdown(block: NoteBlock): string {
  const caption = block.metadata?.caption?.trim()
  switch (block.type) {
    case 'heading': {
      // metadata.level is like "h1".."h4"; default h2.
      const raw = (block.metadata?.level || 'h2').toString().toLowerCase()
      const level = Math.min(Math.max(parseInt(raw.replace('h', ''), 10) || 2, 1), 6)
      return `${'#'.repeat(level)} ${block.content}`.trimEnd()
    }
    case 'code': {
      const lang = block.metadata?.language || ''
      return ['```' + lang, block.content, '```'].join('\n')
    }
    case 'image': {
      const alt = block.metadata?.alt || block.metadata?.filename || 'image'
      const src = block.content
      const img = `![${alt}](${src})`
      return caption ? `${img}\n\n*${caption}*` : img
    }
    case 'video': {
      const label = caption || block.content
      return `${label}\n<${block.content}>`
    }
    case 'text':
    default:
      return block.content
  }
}

export function noteToMarkdown(note: Note, blocks: NoteBlock[]): string {
  const sorted = [...blocks].sort((a, b) => a.order_index - b.order_index)
  const parts: string[] = [`# ${note.title}`]
  if (note.description?.trim()) parts.push(`_${note.description.trim()}_`)
  if (note.visibility === 'public') parts.push('> Public note')
  for (const block of sorted) {
    const text = blockToMarkdown(block)
    if (text) parts.push(text)
  }
  return parts.join('\n\n') + '\n'
}

// ── HTML ─────────────────────────────────────────────────────

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function blockToHtml(block: NoteBlock): string {
  const caption = block.metadata?.caption?.trim()
  switch (block.type) {
    case 'heading': {
      const raw = (block.metadata?.level || 'h2').toString().toLowerCase()
      const level = Math.min(Math.max(parseInt(raw.replace('h', ''), 10) || 2, 1), 6)
      return `<h${level}>${escapeHtml(block.content)}</h${level}>`
    }
    case 'code': {
      const lang = block.metadata?.language
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : ''
      return `<pre><code${cls}>${escapeHtml(block.content)}</code></pre>`
    }
    case 'image': {
      const alt = block.metadata?.alt || block.metadata?.filename || 'image'
      const img = `<img src="${escapeHtml(block.content)}" alt="${escapeHtml(alt)}" />`
      return caption ? `<figure>${img}<figcaption>${escapeHtml(caption)}</figcaption></figure>` : img
    }
    case 'video': {
      const label = caption || block.content
      return `<p><a href="${escapeHtml(block.content)}">${escapeHtml(label)}</a></p>`
    }
    case 'text':
    default:
      return `<p>${escapeHtml(block.content).replace(/\n/g, '<br />')}</p>`
  }
}

export function noteToHtml(note: Note, blocks: NoteBlock[]): string {
  const sorted = [...blocks].sort((a, b) => a.order_index - b.order_index)
  const body = sorted.map(blockToHtml).join('\n')
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(note.title)}</title>`,
    '<style>',
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.6;color:#1d1d1f}',
    'img{max-width:100%;height:auto;border-radius:8px}',
    'pre{background:#f5f5f7;padding:16px;border-radius:8px;overflow:auto}',
    'code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}',
    'figure{margin:16px 0}figcaption{color:#86868b;font-size:14px}',
    '</style>',
    '</head>',
    '<body>',
    `<h1>${escapeHtml(note.title)}</h1>`,
    note.description?.trim() ? `<p><em>${escapeHtml(note.description.trim())}</em></p>` : '',
    body,
    '</body>',
    '</html>',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

// ── JSON ─────────────────────────────────────────────────────

export function noteToJson(note: Note, blocks: NoteBlock[]): string {
  const sorted = [...blocks].sort((a, b) => a.order_index - b.order_index)
  return JSON.stringify(
    {
      id: note.id,
      title: note.title,
      description: note.description,
      slug: note.slug,
      visibility: note.visibility,
      created_at: note.created_at,
      updated_at: note.updated_at,
      blocks: sorted.map((b) => ({
        type: b.type,
        content: b.content,
        order_index: b.order_index,
        metadata: b.metadata ?? {},
      })),
    },
    null,
    2,
  )
}

/**
 * Produce a downloadable payload for a note in the requested format.
 */
export function buildExport(note: Note, blocks: NoteBlock[], format: ExportFormat): ExportPayload {
  const base = slugifyFilename(note.title)
  switch (format) {
    case 'html':
      return { filename: `${base}.html`, mimeType: 'text/html;charset=utf-8', content: noteToHtml(note, blocks) }
    case 'json':
      return { filename: `${base}.json`, mimeType: 'application/json;charset=utf-8', content: noteToJson(note, blocks) }
    case 'markdown':
    default:
      return { filename: `${base}.md`, mimeType: 'text/markdown;charset=utf-8', content: noteToMarkdown(note, blocks) }
  }
}

/**
 * Trigger a browser download of a note in the given format.
 */
export function downloadNote(note: Note, blocks: NoteBlock[], format: ExportFormat): void {
  const payload = buildExport(note, blocks, format)
  const blob = new Blob([payload.content], { type: payload.mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = payload.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Revoke on the next tick so the download can start.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
