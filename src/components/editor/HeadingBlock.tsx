import { useRef, useEffect } from 'react'
import type { BlockMetadata } from '@/types'

interface HeadingBlockProps {
  content:  string
  metadata: BlockMetadata
  onChange: (content: string) => void
  onMeta:   (meta: Partial<BlockMetadata>) => void
}

const LEVELS = [
  { value: 'h1', label: 'Heading 1', fontSize: 'var(--font-size-3xl)', weight: 'var(--font-weight-bold)' },
  { value: 'h2', label: 'Heading 2', fontSize: 'var(--font-size-2xl)', weight: 'var(--font-weight-bold)' },
  { value: 'h3', label: 'Heading 3', fontSize: 'var(--font-size-xl)', weight: 'var(--font-weight-semibold)' },
] as const

export function HeadingBlock({ content, metadata, onChange, onMeta }: HeadingBlockProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const level = (metadata.level as string) || 'h2'
  const levelConfig = LEVELS.find(l => l.value === level) || LEVELS[1]

  // Auto-grow
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [content])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Level selector */}
      <div style={{ display: 'flex', gap: '2px' }}>
        {LEVELS.map(l => (
          <button
            key={l.value}
            onClick={() => onMeta({ level: l.value })}
            style={{
              padding: 'var(--space-1) var(--space-3)',
              border: `1px solid ${level === l.value ? 'var(--color-accent-muted)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              background: level === l.value ? 'var(--color-accent-subtle)' : 'transparent',
              color: level === l.value ? 'var(--color-accent)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: level === l.value ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
              cursor: 'pointer',
              transition: 'all var(--duration-fast)',
            }}
          >
            {l.label}
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        value={content}
        onChange={e => onChange(e.target.value)}
        placeholder={`${levelConfig.label} text…`}
        rows={1}
        style={{
          width: '100%',
          resize: 'none',
          overflow: 'hidden',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: 'var(--font-sans)',
          fontSize: levelConfig.fontSize,
          fontWeight: levelConfig.weight,
          lineHeight: 'var(--line-height-tight)',
          color: 'var(--color-text-primary)',
          padding: 0,
          boxSizing: 'border-box',
          letterSpacing: 'var(--letter-spacing-tight)',
        }}
      />
    </div>
  )
}
