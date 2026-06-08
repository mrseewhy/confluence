import { useRef, useEffect, useCallback } from 'react'

interface TextBlockProps {
  content:  string
  onChange: (content: string) => void
}

function wrapSelection(textarea: HTMLTextAreaElement, before: string, after: string): string {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = textarea.value.substring(start, end)
  // If nothing selected, insert the syntax and place cursor in the middle
  if (!selected) {
    return textarea.value.substring(0, start) + before + after + textarea.value.substring(end)
  }
  return textarea.value.substring(0, start) + before + selected + after + textarea.value.substring(end)
}

export function TextBlock({ content, onChange }: TextBlockProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Auto-grow
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [content])

  const handleBold = useCallback(() => {
    const el = ref.current
    if (!el) return
    onChange(wrapSelection(el, '**', '**'))
  }, [onChange])

  const handleItalic = useCallback(() => {
    const el = ref.current
    if (!el) return
    onChange(wrapSelection(el, '*', '*'))
  }, [onChange])

  // Keyboard shortcuts
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const isBold   = (e.ctrlKey || e.metaKey) && e.key === 'b'
      const isItalic = (e.ctrlKey || e.metaKey) && e.key === 'i'

      if (isBold) {
        e.preventDefault()
        onChange(wrapSelection(el, '**', '**'))
      } else if (isItalic) {
        e.preventDefault()
        onChange(wrapSelection(el, '*', '*'))
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [onChange])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
      }}
    >
      {/* Formatting toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: 'var(--space-1) 0',
        }}
      >
        <button
          type="button"
          onClick={handleBold}
          title="Bold (Ctrl+B)"
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            fontWeight: 700,
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            transition: 'all var(--duration-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-muted)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={handleItalic}
          title="Italic (Ctrl+I)"
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
            fontSize: '14px',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            cursor: 'pointer',
            transition: 'all var(--duration-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-muted)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        >
          <em>I</em>
        </button>
        <span style={{ width: '1px', height: '16px', background: 'var(--color-border)', margin: '0 var(--space-1)' }} />
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
          Markdown supported
        </span>
      </div>

      <textarea
        ref={ref}
        value={content}
        onChange={e => onChange(e.target.value)}
        placeholder="Start writing…"
        rows={3}
        style={{
          width:       '100%',
          resize:      'none',
          overflow:    'hidden',
          border:      'none',
          outline:     'none',
          background:  'transparent',
          fontFamily:  'var(--font-sans)',
          fontSize:    'var(--font-size-base)',
          lineHeight:  'var(--line-height-loose)',
          color:       'var(--color-text-primary)',
          padding:     0,
          boxSizing:   'border-box',
          minHeight:   '80px',
        }}
      />
    </div>
  )
}
