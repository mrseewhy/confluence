import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button, Badge, Card, EmptyState } from '@/components/ui'
import { mockNotes } from '@/lib/mockData'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function NotesPage() {
  const [search, setSearch] = useState('')

  const publicNotes = mockNotes.filter(n => n.visibility === 'public')

  const filtered = publicNotes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (n.folder?.title ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageLayout>
      <div style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-24)' }}>

        {/* Header */}
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <h1 style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: 'var(--letter-spacing-tight)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-3)',
          }}>
            Notes
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--font-size-md)', color: 'var(--color-text-secondary)' }}>
            Browse all public notes from the community.
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <input
            type="search"
            placeholder="Search notes by title, description, or folder…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '480px',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-primary)',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
              outline: 'none',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--color-accent)'
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-subtle)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* Count */}
        <p style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-5)',
          fontFamily: 'var(--font-mono)',
        }}>
          {filtered.length} note{filtered.length !== 1 ? 's' : ''} found
        </p>

        {/* Notes list */}
        {filtered.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {filtered.map(note => (
              <Link key={note.id} to={`/n/${note.slug}`} style={{ textDecoration: 'none' }}>
                <Card hoverable style={{ padding: 'var(--space-5) var(--space-6)' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 'var(--space-6)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-2)',
                      }}>
                        <span style={{ fontSize: '16px' }}>📝</span>
                        <h4 style={{
                          color: 'var(--color-text-primary)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {note.title}
                        </h4>
                      </div>

                      {note.description && (
                        <p style={{
                          margin: '0 0 var(--space-3)',
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {note.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        {note.folder && (
                          <Badge variant="accent">📁 {note.folder.title}</Badge>
                        )}
                        <span style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-muted)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {formatDate(note.updated_at)}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      style={{ flexShrink: 0 }}
                      onClick={e => e.preventDefault()}
                    >
                      Read →
                    </Button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📭"
            title="No notes found"
            description="Try adjusting your search."
            action={
              <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
                Clear search
              </Button>
            }
          />
        )}
      </div>
    </PageLayout>
  )
}
