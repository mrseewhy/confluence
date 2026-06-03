import { useRef, useEffect } from 'react'

interface TextBlockProps {
  content:  string
  onChange: (content: string) => void
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

  return (
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
  )
}
