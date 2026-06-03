import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button, Badge, Card, EmptyState } from '@/components/ui'
import { mockFolders } from '@/lib/mockData'
import type { Folder } from '@/types'

function FolderCard({ folder }: { folder: Folder }) {
  const [expanded, setExpanded] = useState(false)
  const hasSubfolders = folder.subfolders && folder.subfolders.length > 0

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* Main folder row */}
      <div style={{ padding: 'var(--space-6)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '22px', flexShrink: 0 }}>
              {folder.visibility === 'private' ? '🔒' : '📁'}
            </span>
            <div style={{ minWidth: 0 }}>
              <Link to={`/folder/${folder.slug}`} style={{ textDecoration: 'none' }}>
                <h4 style={{
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-1)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {folder.title}
                </h4>
              </Link>
              <p style={{
                margin: 0,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {folder.description}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
            <Badge variant={folder.visibility === 'public' ? 'accent' : 'muted'}>
              {folder.visibility}
            </Badge>
            {folder.note_count !== undefined && (
              <Badge variant="default">{folder.note_count} notes</Badge>
            )}
          </div>
        </div>

        {/* Subfolder toggle + open button */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to={`/folder/${folder.slug}`}>
            <Button variant="secondary" size="xs">Open folder</Button>
          </Link>
          {hasSubfolders && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setExpanded(p => !p)}
            >
              {expanded ? '▾' : '▸'} {folder.subfolders!.length} subfolder{folder.subfolders!.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Subfolder list */}
      {hasSubfolders && expanded && (
        <div style={{
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg-subtle)',
          padding: 'var(--space-4) var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}>
          {folder.subfolders!.map(sf => (
            <div key={sf.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', flexShrink: 0 }}>└</span>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>📂</span>
                <div style={{ minWidth: 0 }}>
                  <Link to={`/folder/${sf.slug}`} style={{ textDecoration: 'none' }}>
                    <span style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                    }}>
                      {sf.title}
                    </span>
                  </Link>
                  {sf.description && (
                    <span style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-muted)',
                    }}>
                      {sf.description}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                {sf.note_count !== undefined && (
                  <Badge variant="muted">{sf.note_count} notes</Badge>
                )}
                <Link to={`/folder/${sf.slug}`}>
                  <Button variant="secondary" size="xs">Open</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export function FoldersPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all')

  const publicFolders = mockFolders.filter(f => f.parent_id === null)

  const filtered = publicFolders.filter(f => {
    const matchesSearch =
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      (f.description ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || f.visibility === filter
    return matchesSearch && matchesFilter
  })

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
            Folders
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--font-size-md)', color: 'var(--color-text-secondary)' }}>
            Browse public folders. Click any folder to explore its notes.
          </p>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-8)',
          flexWrap: 'wrap',
        }}>
          <input
            type="search"
            placeholder="Search folders…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: '1 1 240px',
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
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {(['all', 'public', 'private'] as const).map(v => (
              <Button
                key={v}
                variant={filter === v ? 'accent-ghost' : 'secondary'}
                size="sm"
                onClick={() => setFilter(v)}
                style={{ textTransform: 'capitalize' }}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-5)',
          fontFamily: 'var(--font-mono)',
        }}>
          {filtered.length} folder{filtered.length !== 1 ? 's' : ''} found
        </p>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 'var(--space-4)',
          }}>
            {filtered.map(folder => (
              <FolderCard key={folder.id} folder={folder} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📭"
            title="No folders found"
            description="Try adjusting your search or filters."
            action={
              <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setFilter('all') }}>
                Clear filters
              </Button>
            }
          />
        )}
      </div>
    </PageLayout>
  )
}
