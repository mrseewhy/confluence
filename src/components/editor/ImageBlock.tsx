import { useState, useRef } from 'react'
import type { BlockMetadata } from '@/types'

interface ImageBlockProps {
  content:  string
  metadata: BlockMetadata
  onChange: (content: string) => void
  onMeta:   (meta: Partial<BlockMetadata>) => void
}

type ImageMode = 'upload' | 'url'

export function ImageBlock({ content, metadata, onChange, onMeta }: ImageBlockProps) {
  const [mode, setMode] = useState<ImageMode>('upload')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const isUrl = content.startsWith('http://') || content.startsWith('https://')

  function handleFile(file: File) {
    // No real upload yet — just store the filename as content
    onChange(file.name)
    onMeta({ filename: file.name })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding:      'var(--space-1) var(--space-3)',
    borderRadius: 'var(--radius-sm)',
    border:       'none',
    background:   active ? 'var(--color-bg-muted)' : 'transparent',
    color:        active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
    fontFamily:   'var(--font-sans)',
    fontSize:     'var(--font-size-xs)',
    fontWeight:   active ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
    cursor:       'pointer',
    transition:   'all var(--duration-fast)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* Mode tabs */}
      <div style={{
        display:    'flex',
        gap:        '2px',
        background: 'var(--color-bg-subtle)',
        borderRadius: 'var(--radius-md)',
        padding:    '3px',
        alignSelf:  'flex-start',
      }}>
        <button style={tabStyle(mode === 'upload')} onClick={() => setMode('upload')}>Upload</button>
        <button style={tabStyle(mode === 'url')}    onClick={() => setMode('url')}>URL</button>
      </div>

      {/* Upload mode */}
      {mode === 'upload' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border:       `2px dashed ${dragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            padding:      'var(--space-10) var(--space-6)',
            textAlign:    'center',
            cursor:       'pointer',
            background:   dragging ? 'var(--color-accent-subtle)' : 'var(--color-bg-subtle)',
            transition:   'all var(--duration-fast)',
            display:      'flex',
            flexDirection:'column',
            alignItems:   'center',
            gap:          'var(--space-2)',
          }}
        >
          <span style={{ fontSize: '28px', opacity: 0.5 }}>🖼️</span>
          {content && !isUrl ? (
            <>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-accent)' }}>
                {content}
              </p>
              <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Click or drop to replace
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>
                Drop an image here, or click to browse
              </p>
              <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                PNG, JPG, GIF, WebP supported
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </div>
      )}

      {/* URL mode */}
      {mode === 'url' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <input
            type="url"
            placeholder="https://example.com/image.png"
            value={isUrl ? content : ''}
            onChange={e => {
              onChange(e.target.value)
              onMeta({ filename: undefined })
            }}
            style={{
              width:        '100%',
              fontFamily:   'var(--font-sans)',
              fontSize:     'var(--font-size-sm)',
              color:        'var(--color-text-primary)',
              background:   'var(--color-bg-elevated)',
              border:       '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding:      'var(--space-3)',
              outline:      'none',
              boxSizing:    'border-box',
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
          {/* Image preview */}
          {isUrl && content && (
            <img
              src={content}
              alt={metadata.alt ?? 'Image preview'}
              style={{
                maxWidth:     '100%',
                maxHeight:    '280px',
                objectFit:    'contain',
                borderRadius: 'var(--radius-lg)',
                border:       '1px solid var(--color-border)',
              }}
            />
          )}
        </div>
      )}

      {/* Alt text + caption (shared) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <input
          type="text"
          placeholder="Alt text (for accessibility)"
          value={metadata.alt ?? ''}
          onChange={e => onMeta({ alt: e.target.value })}
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

      {/* Upload hint */}
      <p style={{
        margin:     0,
        fontSize:   'var(--font-size-xs)',
        color:      'var(--color-text-muted)',
        fontStyle:  'italic',
      }}>
        Images will be uploaded to storage once Supabase is connected.
      </p>
    </div>
  )
}
