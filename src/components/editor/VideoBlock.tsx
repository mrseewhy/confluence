import { useState } from 'react'
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
      try {
        if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1]?.split('?')[0] ?? null
        } else {
          const u = new URL(url)
          videoId = u.searchParams.get('v')
          // Also check for /embed/ already in URL
          if (!videoId && url.includes('/embed/')) {
            videoId = url.split('/embed/')[1]?.split('?')[0] ?? null
          }
        }
      } catch {
        // Invalid URL
      }
      // Use youtube-nocookie.com to avoid tracking + X-Frame-Options issues
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
  const [embedFailed, setEmbedFailed] = useState(false)

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

      {/* Embed preview or fallback */}
      {embedUrl && !embedFailed && (
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
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width:  '100%',
              height: '100%',
              border: 'none',
            }}
          />
          {/* Embed-not-working button */}
          <button
            onClick={() => setEmbedFailed(true)}
            title="Embed not working? Switch to link view"
            style={{
              position: 'absolute',
              bottom: 'var(--space-2)',
              right:  'var(--space-2)',
              padding: 'var(--space-1) var(--space-2)',
              fontSize: '10px',
              fontFamily: 'var(--font-sans)',
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              opacity: 0.5,
              transition: 'opacity var(--duration-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.5' }}
          >
            {'\u26A0'} Embed issue?
          </button>
        </div>
      )}

      {/* Fallback view */}
      {embedUrl && embedFailed && (
        <div
          style={{
            borderRadius: 'var(--radius-lg)',
            border:       '1px solid var(--color-warning)',
            background:   'var(--color-warning-subtle)',
            padding:      'var(--space-6)',
            textAlign:    'center',
            display:      'flex',
            flexDirection:'column',
            alignItems:   'center',
            gap:          'var(--space-3)',
          }}
        >
          <span style={{ fontSize: '24px' }}>{'\u26A0\uFE0F'}</span>
          <div>
            <p style={{
              margin: 0,
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-warning)',
            }}>
              Video can't be embedded here
            </p>
            <p style={{
              margin: 'var(--space-1) 0 0',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-muted)',
            }}>
              The video provider may have restricted embedding. Open it directly to watch.
            </p>
          </div>
          <a
            href={content.startsWith('http') ? content : '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning)',
              color: '#fff',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              textDecoration: 'none',
              transition: 'opacity var(--duration-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            {provider === 'youtube' ? 'Watch on YouTube' :
             provider === 'loom' ? 'Watch on Loom' :
             provider === 'vimeo' ? 'Watch on Vimeo' :
             'Open video'}
            {'\u2197'}
          </a>
          <button
            onClick={() => setEmbedFailed(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Try embed anyway
          </button>
        </div>
      )}

      {/* Direct link always visible below embed */}
      {embedUrl && !embedFailed && content.startsWith('http') && (
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
            fontFamily: 'var(--font-sans)',
            transition: 'color var(--duration-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
        >
          {'\u2197'} Open in{' '}
          {provider === 'youtube' ? 'YouTube' :
           provider === 'loom' ? 'Loom' :
           provider === 'vimeo' ? 'Vimeo' :
           'new tab'}
        </a>
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
