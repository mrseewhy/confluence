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
  const mins = Math.floor(diff / 60000)
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

// ── Avatar helpers ────────────────────────────────────────────

const AVATAR_COLORS = [
  '#0D7F66', '#B87009', '#4F46E5', '#BE185D',
  '#059669', '#D97706', '#7C3AED', '#DB2777',
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export interface AvatarProps {
  name: string
  size?: number
  color?: string
}

export function Avatar({ name, size = 32, color }: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color ?? getAvatarColor(name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: size * 0.4,
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        flexShrink: 0,
        lineHeight: 1,
      }}
      title={name}
    >
      {getInitials(name)}
    </div>
  )
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
