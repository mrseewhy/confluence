import type { BlockMetadata } from '@/types'

interface VideoBlockProps {
  content:  string
  metadata: BlockMetadata
  onChange: (content: string) => void
  onMeta:   (meta: Partial<BlockMetadata>) => void
}

type VideoProvider = 'youtube' | 'loom' | 'vimeo' | null

function detectProvider(url: string): VideoProvider {
  if (!url) return null
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('loom.com'))  return 'loom'
  if (url.includes('vimeo.com')) return 'vimeo'
  return null
}

function getEmbedUrl(url: string, provider: VideoProvider): string | null {
  try {
    if (provider === 'youtube') {
      // Support both youtube.com/watch?v=ID and youtu.be/ID
      let videoId: string | null = null
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] ?? null
      } else {
        const u = new URL(url)
        videoId = u.searchParams.get('v')
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null
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

const PROVIDER_LABELS: Record<Exclude<VideoProvider, null>, string> = {
  youtube: '▶ YouTube',
  loom:    '○ Loom',
  vimeo:   '◈ Vimeo',
}

const PROVIDER_COLORS: Record<Exclude<VideoProvider, null>, string> = {
  youtube: '#FF0000',
  loom:    '#625DF5',
  vimeo:   '#1AB7EA',
}

export function VideoBlock({ content, metadata, onChange, onMeta }: VideoBlockProps) {
  const provider = detectProvider(content)
  const embedUrl = provider ? getEmbedUrl(content, provider) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* URL input with provider badge */}
      <div style={{ position: 'relative' }}>
        <input
          type="url"
          placeholder="Paste a YouTube, Loom, or Vimeo URL…"
          value={content}
          onChange={e => onChange(e.target.value)}
          style={{
            width:        '100%',
            fontFamily:   'var(--font-sans)',
            fontSize:     'var(--font-size-sm)',
            color:        'var(--color-text-primary)',
            background:   'var(--color-bg-elevated)',
            border:       '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding:      provider
              ? 'var(--space-3) 100px var(--space-3) var(--space-3)'
              : 'var(--space-3)',
            outline:      'none',
            boxSizing:    'border-box',
            transition:   'border-color var(--duration-fast)',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--color-accent)'
            e.currentTarget.style.boxShadow   = '0 0 0 3px var(--color-accent-subtle)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
            e.currentTarget.style.boxShadow   = 'none'
          }}
        />
        {/* Provider badge */}
        {provider && (
          <span style={{
            position:     'absolute',
            right:        'var(--space-3)',
            top:          '50%',
            transform:    'translateY(-50%)',
            fontSize:     '11px',
            fontWeight:   'var(--font-weight-semibold)',
            color:        PROVIDER_COLORS[provider],
            background:   `${PROVIDER_COLORS[provider]}18`,
            padding:      '2px 8px',
            borderRadius: 'var(--radius-full)',
            border:       `1px solid ${PROVIDER_COLORS[provider]}30`,
            pointerEvents:'none',
            whiteSpace:   'nowrap',
          }}>
            {PROVIDER_LABELS[provider]}
          </span>
        )}
      </div>

      {/* Embed preview */}
      {embedUrl && (
        <div style={{
          position:     'relative',
          paddingTop:   '56.25%', // 16:9
          borderRadius: 'var(--radius-lg)',
          overflow:     'hidden',
          border:       '1px solid var(--color-border)',
          background:   'var(--color-bg-muted)',
        }}>
          <iframe
            src={embedUrl}
            title="Video embed"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width:  '100%',
              height: '100%',
              border: 'none',
            }}
          />
        </div>
      )}

      {/* No-embed hint when URL is present but can't be parsed */}
      {content && !embedUrl && content.startsWith('http') && (
        <p style={{
          margin:     0,
          fontSize:   'var(--font-size-xs)',
          color:      'var(--color-warning)',
          fontStyle:  'italic',
        }}>
          Couldn't generate a preview for this URL. Only YouTube, Loom, and Vimeo are supported.
        </p>
      )}

      {/* Caption */}
      <input
        type="text"
        placeholder="Caption (optional)"
        value={metadata.caption ?? ''}
        onChange={e => onMeta({ caption: e.target.value })}
        style={{
          fontFamily:   'var(--font-sans)',
          fontSize:     'var(--font-size-sm)',
          color:        'var(--color-text-primary)',
          background:   'var(--color-bg-elevated)',
          border:       '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding:      'var(--space-2) var(--space-3)',
          outline:      'none',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
        onBlur={e  => { e.currentTarget.style.borderColor = 'var(--color-border)'  }}
      />
    </div>
  )
}
