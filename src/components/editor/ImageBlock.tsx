import { useState, useRef } from 'react'
import type { BlockMetadata } from '@/types'
import { useAuth } from '@/context/auth'
import { uploadImage } from '@/lib/upload'
import { sanitizeImageUrl } from '@/lib/helpers'

interface ImageBlockProps {
  content:  string
  metadata: BlockMetadata
  onChange: (content: string) => void
  onMeta:   (meta: Partial<BlockMetadata>) => void
}

type ImageMode = 'upload' | 'url'

export function ImageBlock({ content, metadata, onChange, onMeta }: ImageBlockProps) {
  const { profile } = useAuth()
  const [mode, setMode] = useState<ImageMode>('upload')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isUrl = content.startsWith('http://') || content.startsWith('https://')

  async function handleFile(file: File) {
    if (!profile) {
      setUploadError('You must be signed in to upload images.')
      return
    }

    setUploadError(null)
    setUploading(true)

    const result = await uploadImage(file, profile.id)

    setUploading(false)

    if (result.ok) {
      onChange(result.url)
      onMeta({ filename: file.name })
    } else {
      setUploadError(result.error)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) void handleFile(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
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
          onClick={() => { if (!uploading) fileRef.current?.click() }}
          style={{
            border:       `2px dashed ${dragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            padding:      'var(--space-10) var(--space-6)',
            textAlign:    'center',
            cursor:       uploading ? 'default' : 'pointer',
            background:   dragging ? 'var(--color-accent-subtle)' : 'var(--color-bg-subtle)',
            transition:   'all var(--duration-fast)',
            display:      'flex',
            flexDirection:'column',
            alignItems:   'center',
            gap:          'var(--space-2)',
            opacity:      uploading ? 0.6 : 1,
          }}
        >
          <span style={{ fontSize: '28px', opacity: 0.5 }}>
            {uploading ? '⏳' : '🖼️'}
          </span>
          {uploading ? (
            <>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-accent)' }}>
                Uploading…
              </p>
              <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Please wait while your image is uploaded
              </p>
            </>
          ) : content && !isUrl ? (
            <>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-accent)' }}>
                {metadata.filename || content}
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
                PNG, JPG, GIF, WebP, SVG supported (max 5 MB)
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <p style={{
          margin: 0,
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-danger)',
        }}>
          ✗ {uploadError}
        </p>
      )}

      {/* Image preview (when URL is set, upload mode only — URL mode has its own preview) */}
      {mode === 'upload' && isUrl && content && (
        <img
          src={sanitizeImageUrl(content) ?? ''}
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
          {/* Image preview for URL mode (only shown in this mode) */}
          {isUrl && content && (
            <img
              src={sanitizeImageUrl(content) ?? ''}
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
    </div>
  )
}
