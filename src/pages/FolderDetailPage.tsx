import { use } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button, Badge, Card, EmptyState } from '@/components/ui'
import { AuthContext } from '@/context/auth'
import { mockFolders, mockNotes, hasFolderAccess } from '@/lib/mockData'

export function FolderDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const authCtx = use(AuthContext)
  const user = authCtx?.profile ?? null
  const userEmail = authCtx?.user?.email ?? ''

  // Find folder (checks root and nested subfolders)
  let folder = mockFolders.find(f => f.slug === slug)
  let parentFolder = null

  if (!folder) {
    // Check nested subfolders
    for (const r of mockFolders) {
      const sub = r.subfolders?.find(sf => sf.slug === slug)
      if (sub) {
        folder = sub
        parentFolder = r
        break
      }
    }
  }

  if (!folder) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: '120px 0', color: 'var(--color-text-muted)' }}>
          <h2>404 — Folder Not Found</h2>
          <p>The folder you are looking for does not exist or has been deleted.</p>
          <Link to="/folders" style={{ color: 'var(--color-accent)' }}>Back to public folders</Link>
        </div>
      </PageLayout>
    )
  }

  // Security Check (Cascading authorization)
  const isAuthorized = hasFolderAccess(
    folder.id,
    user?.id ?? '',
    userEmail,
    user?.user_type ?? ''
  )

  if (!isAuthorized) {
    return (
      <PageLayout noFooter>
        <div style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-8)',
        }}>
          <Card style={{
            maxWidth: '440px',
            textAlign: 'center',
            padding: 'var(--space-10) var(--space-8)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            boxShadow: 'var(--shadow-2xl)',
            borderRadius: 'var(--radius-2xl)',
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: 'var(--space-4)' }}>🔒</span>
            <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
              This folder is private
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-normal)', marginBottom: 'var(--space-6)' }}>
              You do not have access to view this folder. If you have been invited, please sign in with your invited email credentials.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {!user ? (
                <>
                  <Button variant="primary" onClick={() => navigate('/login')}>
                    Sign in to request access
                  </Button>
                  <Link to="/folders" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)', textDecoration: 'none' }}>
                    Browse other public folders
                  </Link>
                </>
              ) : (
                <>
                  <Badge variant="muted" style={{ padding: '8px', marginBottom: 'var(--space-3)' }}>
                    Logged in as: {userEmail}
                  </Badge>
                  <Button variant="secondary" onClick={() => navigate('/folders')}>
                    Browse public folders
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </PageLayout>
    )
  }

  // Retrieve subfolders nested in this folder
  const subfolders = folder.subfolders ?? []

  // Retrieve notes inside this folder
  const notes = mockNotes.filter(n => n.folder_id === folder.id)

  return (
    <PageLayout>
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-24)' }}>
        
        {/* Navigation Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-8)' }}>
          <Link to="/folders" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Folders</Link>
          <span style={{ color: 'var(--color-border-strong)' }}>/</span>
          {parentFolder && (
            <>
              <Link to={`/folder/${parentFolder.slug}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                {parentFolder.title}
              </Link>
              <span style={{ color: 'var(--color-border-strong)' }}>/</span>
            </>
          )}
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-semibold)' }}>
            {folder.title}
          </span>
        </div>

        {/* Folder Header */}
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <Badge variant={folder.visibility === 'public' ? 'accent' : 'muted'}>
              {folder.visibility === 'public' ? '🌎 Public' : '🔒 Private'}
            </Badge>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {notes.length} note{notes.length !== 1 ? 's' : ''} • {subfolders.length} subfolder{subfolders.length !== 1 ? 's' : ''}
            </span>
          </div>

          <h1 style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: 'var(--letter-spacing-tight)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-2)',
          }}>
            📁 {folder.title}
          </h1>

          {folder.description && (
            <p style={{ margin: 0, fontSize: 'var(--font-size-md)', color: 'var(--color-text-secondary)' }}>
              {folder.description}
            </p>
          )}
        </div>

        {/* Subfolders Section */}
        {subfolders.length > 0 && (
          <div style={{ marginBottom: 'var(--space-10)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
              Subfolders
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
              {subfolders.map(sf => (
                <Link key={sf.id} to={`/folder/${sf.slug}`} style={{ textDecoration: 'none' }}>
                  <Card hoverable style={{ padding: 'var(--space-4) var(--space-5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span style={{ fontSize: '24px' }}>📂</span>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sf.title}
                        </span>
                        {sf.description && (
                          <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sf.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-subtle)', margin: 'var(--space-8) 0' }} />

        {/* Notes list */}
        <div>
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
            Notes in this folder
          </h3>

          {notes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {notes.map(note => (
                <Link key={note.id} to={`/n/${note.slug}`} style={{ textDecoration: 'none' }}>
                  <Card hoverable style={{ padding: 'var(--space-4) var(--space-5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span style={{ fontSize: '18px' }}>📝</span>
                        <div>
                          <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                            {note.title}
                          </span>
                          {note.description && (
                            <span style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                              {note.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={note.visibility === 'public' ? 'accent' : 'muted'}>
                        {note.visibility}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="📭"
              title="No notes in this folder"
              description="Create a note and choose this folder to list it here."
            />
          )}
        </div>
      </div>
    </PageLayout>
  )
}
