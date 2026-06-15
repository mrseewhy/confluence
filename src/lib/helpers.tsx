// ============================================================
// CONFLUENCE — Shared Helpers
// ============================================================

// ── Date helpers ──────────────────────────────────────────────

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const absDiff = Math.abs(diff)
  const mins = Math.floor(absDiff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

// ── Slug helper ───────────────────────────────────────────────

export function buildSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

// ── Folder path builder ───────────────────────────────────────

export function buildFolderPath(
  folderId: string,
  folderTitle: string,
  folderSlug: string,
  parentMap: Record<string, { id: string; title: string; slug: string; parent_id: string | null }>,
): { title: string; slug: string }[] {
  const path: { title: string; slug: string }[] = [
    { title: folderTitle, slug: folderSlug },
  ]
  let currentId = folderId
  let maxDepth = 0
  while (maxDepth < 10) {
    const entry = parentMap[currentId]
    const parentId = entry?.parent_id
    if (!parentId) break
    const parent = parentMap[parentId]
    if (!parent) break
    path.unshift({ title: parent.title, slug: parent.slug })
    currentId = parent.id
    maxDepth++
  }
  return path
}

// ── Video embed helpers ────────────────────────────────────────

export type VideoProvider = 'youtube' | 'loom' | 'vimeo' | null

export function detectVideoProvider(url: string): VideoProvider {
  if (!url) return null
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('loom.com'))  return 'loom'
  if (url.includes('vimeo.com')) return 'vimeo'
  return null
}

export function getVideoEmbedUrl(url: string, provider: VideoProvider): string | null {
  try {
    if (provider === 'youtube') {
      let videoId: string | null = null
      try {
        if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1]?.split('?')[0] ?? null
        } else {
          const u = new URL(url)
          videoId = u.searchParams.get('v')
          if (!videoId && url.includes('/embed/')) {
            videoId = url.split('/embed/')[1]?.split('?')[0] ?? null
          }
        }
      } catch {
        // Invalid URL
      }
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null
    }

    if (provider === 'loom') {
      const parts = url.split('loom.com/share/')
      const id = parts[1]?.split('?')[0]
      return id ? `https://www.loom.com/embed/${id}` : null
    }

    if (provider === 'vimeo') {
      const parts = url.split('vimeo.com/')
      const id = parts[1]?.split('/')[0]?.split('?')[0]
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {
    // Invalid URL — ignore
  }
  return null
}

// ── URL safety ────────────────────────────────────────────────

/** Sanitize an image URL — returns null for unsafe protocols. */
export function sanitizeImageUrl(url: string): string | null {
  if (!url) return null
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
    return null
  }
  return url
}

/**
 * Validate a user-provided URL — returns null for unsafe protocols
 * or malformed URLs. Use before rendering user-provided links.
 */
export function validateUrl(url: string): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const allowed = ['http:', 'https:', 'mailto:']
    if (!allowed.includes(parsed.protocol)) return null
    return url
  } catch {
    return null
  }
}

/**
 * ⚠️  XSS WARNING  ⚠️
 *
 * All block content (text, code, headings) is rendered through
 * React's default text rendering, which escapes HTML automatically.
 *
 * NEVER use `dangerouslySetInnerHTML` with user-supplied block content.
 * If you need rich text rendering in the future, use a proper
 * sanitization library like DOMPurify before setting inner HTML.
 */

// ── Owner query fragment ──────────────────────────────────────

export const OWNER_QUERY = 'id, full_name, avatar_url, username'

export function mapOwner(
  owner: { full_name?: string; avatar_url?: string | null; username?: string | null } | null,
  fallbackName: string,
) {
  return {
    name: owner?.full_name || fallbackName,
    avatar: owner?.avatar_url ?? null,
    username: owner?.username || null,
  }
}
