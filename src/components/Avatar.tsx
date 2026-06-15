// ── Avatar component ───────────────────────────────────────────
// Extracted from @/lib/helpers to fix react-refresh/only-export-components

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
