import { useRef, useEffect } from 'react'
import type { BlockMetadata } from '@/types'

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'bash',    'sql',
  'html',       'css',        'json',   'rust',     'go',
  'java',       'cpp',        'c',      'php',      'ruby',
  'swift',      'kotlin',     'yaml',   'markdown', 'text',
]

interface CodeBlockProps {
  content:  string
  metadata: BlockMetadata
  onChange: (content: string) => void
  onMeta:   (meta: Partial<BlockMetadata>) => void
}

export function CodeBlock({ content, metadata, onChange, onMeta }: CodeBlockProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Auto-grow
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 160)}px`
  }, [content])

  const language = metadata.language ?? 'javascript'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Language selector bar */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            'var(--space-3)',
        padding:        'var(--space-2) var(--space-4)',
        background:     'rgba(0,0,0,0.25)',
        borderBottom:   '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{
          fontSize:   'var(--font-size-xs)',
          fontFamily: 'var(--font-mono)',
          color:      'rgba(255,255,255,0.35)',
          userSelect: 'none',
        }}>
          lang:
        </span>
        <select
          value={language}
          onChange={e => onMeta({ language: e.target.value })}
          style={{
            background:   'transparent',
            border:       'none',
            outline:      'none',
            color:        'rgba(232,230,242,0.75)',
            fontFamily:   'var(--font-mono)',
            fontSize:     'var(--font-size-xs)',
            cursor:       'pointer',
            padding:      '1px 4px',
          }}
        >
          {LANGUAGES.map(lang => (
            <option key={lang} value={lang} style={{ background: '#18171C', color: '#E8E6F2' }}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      {/* Code textarea */}
      <textarea
        ref={ref}
        value={content}
        onChange={e => onChange(e.target.value)}
        placeholder={`// ${language} code…`}
        spellCheck={false}
        rows={6}
        style={{
          width:       '100%',
          resize:      'none',
          overflow:    'hidden',
          border:      'none',
          outline:     'none',
          background:  'transparent',
          fontFamily:  'var(--font-mono)',
          fontSize:    'var(--font-size-sm)',
          lineHeight:  '1.7',
          color:       'var(--color-code-text)',
          padding:     'var(--space-4)',
          boxSizing:   'border-box',
          minHeight:   '160px',
          tabSize:     2,
          whiteSpace:  'pre',
        }}
        onKeyDown={e => {
          // Tab key inserts spaces instead of losing focus
          if (e.key === 'Tab') {
            e.preventDefault()
            const el = e.currentTarget
            const start = el.selectionStart
            const end   = el.selectionEnd
            const next  = content.substring(0, start) + '  ' + content.substring(end)
            onChange(next)
            // Restore cursor after React re-render
            requestAnimationFrame(() => {
              el.selectionStart = start + 2
              el.selectionEnd   = start + 2
            })
          }
        }}
      />
    </div>
  )
}
