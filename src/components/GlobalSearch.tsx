import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { requireSupabase } from '@/lib/supabase'
import { KIND_META, hitHref, normaliseHits, type SearchHit } from '@/lib/globalSearch'

interface GlobalSearchProps {
  /** Renders inline in the topbar (default) or as a full overlay. */
  autoFocus?: boolean
  onNavigate?: () => void
}

/**
 * Cross-content search over notes, folders and people.
 * Opens from the topbar button or with ⌘K / Ctrl+K.
 */
export function GlobalSearch({ autoFocus = false, onNavigate }: GlobalSearchProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestId = useRef(0)

  // ⌘K / Ctrl+K toggles the palette from anywhere in the dashboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      // Focus after the dialog mounts.
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setQuery('')
      setHits([])
      setActive(0)
      setError(null)
    }, 0)
    return () => clearTimeout(t)
  }, [open])

  // Debounced query. requestId guards against out-of-order responses.
  useEffect(() => {
    const q = query.trim()
    if (!open || q.length < 2) {
      // Reset via a microtask so we do not setState synchronously in the effect.
      const reset = setTimeout(() => {
        setHits([])
        setLoading(false)
      }, 0)
      return () => clearTimeout(reset)
    }
    const id = ++requestId.current
    const timer = setTimeout(() => {
      setLoading(true)
      void (async () => {
        try {
          const supabase = requireSupabase()
          const { data, error: rpcError } = await supabase.rpc('global_search', {
            p_query: q,
            p_limit: 5,
          })
          if (rpcError) throw rpcError
          if (requestId.current !== id) return
          setHits(normaliseHits(data))
          setActive(0)
          setError(null)
        } catch {
          if (requestId.current === id) setError('Search is unavailable right now.')
        } finally {
          if (requestId.current === id) setLoading(false)
        }
      })()
    }, 250)
    return () => clearTimeout(timer)
  }, [query, open])

  const go = useCallback(
    (hit: SearchHit) => {
      setOpen(false)
      onNavigate?.()
      navigate(hitHref(hit))
    },
    [navigate, onNavigate],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && hits[active]) {
      e.preventDefault()
      go(hits[active])
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Search (⌘K)"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          fontSize: 'var(--font-size-sm)',
          minWidth: '180px',
        }}
      >
        <span aria-hidden="true">🔍</span>
        <span style={{ flex: 1, textAlign: 'left' }}>Search</span>
        <kbd
          aria-hidden="true"
          style={{
            fontSize: '10px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '1px 4px',
            fontFamily: 'inherit',
          }}
        >
          ⌘K
        </kbd>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 300,
              backdropFilter: 'blur(2px)',
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            style={{
              position: 'fixed',
              top: '15vh',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 301,
              width: 'min(560px, calc(100vw - 32px))',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
            }}
          >
            <input
              ref={inputRef}
              autoFocus={autoFocus}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search notes, folders and people…"
              aria-label="Search notes, folders and people"
              style={{
                width: '100%',
                padding: 'var(--space-4)',
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-md)',
                outline: 'none',
              }}
            />

            <div style={{ maxHeight: '50vh', overflow: 'auto' }} role="listbox" aria-label="Search results">
              {error && (
                <p style={{ padding: 'var(--space-4)', margin: 0, color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>
                  {error}
                </p>
              )}
              {!error && loading && (
                <p style={{ padding: 'var(--space-4)', margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                  Searching…
                </p>
              )}
              {!error && !loading && query.trim().length >= 2 && hits.length === 0 && (
                <p style={{ padding: 'var(--space-4)', margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                  No matches for “{query.trim()}”.
                </p>
              )}
              {!error && query.trim().length < 2 && (
                <p style={{ padding: 'var(--space-4)', margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                  Type at least 2 characters. Tip: use ⌘K anywhere.
                </p>
              )}
              {hits.map((hit, i) => (
                <button
                  key={`${hit.kind}-${hit.id}`}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(hit)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    width: '100%',
                    padding: 'var(--space-3) var(--space-4)',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    background: i === active ? 'var(--color-bg-subtle)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'inherit',
                  }}
                >
                  <span aria-hidden="true">{KIND_META[hit.kind]?.icon ?? '📝'}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {hit.title}
                    </span>
                    {hit.subtitle && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {hit.subtitle}
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {KIND_META[hit.kind]?.label ?? ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
