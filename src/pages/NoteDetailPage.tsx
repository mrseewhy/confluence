import { use } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button, Badge, Card } from '@/components/ui'
import { AuthContext } from '@/context/auth'
import { mockNotes, hasNoteAccess } from '@/lib/mockData'
import type { NoteBlock } from '@/types'

// Mock rich blocks for the initial notes to make the detail view premium
const INITIAL_NOTE_BLOCKS: Record<string, NoteBlock[]> = {
  'getting-started-with-confluence': [
    {
      id: 'b-gen-1',
      note_id: 'n-gen1',
      type: 'text',
      content: 'Welcome to **Confluence**, your ultimate knowledge hub. Confluence is designed to help engineers, authors, and designers construct beautiful documentation, personal wikis, or tutorials and share them publicly or collaborate in private. Notes in Confluence are structured as content blocks.',
      order_index: 0,
      metadata: {},
      created_at: new Date().toISOString(),
    },
    {
      id: 'b-gen-2',
      note_id: 'n-gen1',
      type: 'code',
      content: 'const confluence = {\n  type: "note-sharing-platform",\n  features: ["rich-editor", "cascading-permissions", "google-auth"],\n  isPremium: true\n};\nconsole.log(`Confluence initialized:`, confluence);',
      order_index: 1,
      metadata: { language: 'javascript' },
      created_at: new Date().toISOString(),
    },
    {
      id: 'b-gen-3',
      note_id: 'n-gen1',
      type: 'text',
      content: 'You can insert live image uploads or embeds like the one below, alongside fully interactive high-definition media players.',
      order_index: 2,
      metadata: {},
      created_at: new Date().toISOString(),
    },
    {
      id: 'b-gen-4',
      note_id: 'n-gen1',
      type: 'image',
      content: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
      order_index: 3,
      metadata: { caption: 'Confluence visual workspaces.' },
      created_at: new Date().toISOString(),
    },
  ],
  'how-to-set-up-a-react-project': [
    {
      id: 'b1',
      note_id: 'n1',
      type: 'text',
      content: 'React 19 with Vite is the modern standard for fast web application scaffolding. This guide will walk you through building a high-performance boilerplate.',
      order_index: 0,
      metadata: {},
      created_at: new Date().toISOString(),
    },
    {
      id: 'b2',
      note_id: 'n1',
      type: 'code',
      content: '# Create Vite app in modern typescript\nnpx create-vite@latest my-app --template react-ts\ncd my-app\nnpm install',
      order_index: 1,
      metadata: { language: 'bash' },
      created_at: new Date().toISOString(),
    },
  ],
  'jwt-authentication-express': [
    {
      id: 'b-jwt-1',
      note_id: 'n2',
      type: 'text',
      content: 'Securing API endpoints using JSON Web Tokens (JWT) guarantees safe, stateless data transfers. Here is how you can establish a middleware verify block in Express.',
      order_index: 0,
      metadata: {},
      created_at: new Date().toISOString(),
    },
    {
      id: 'b-jwt-2',
      note_id: 'n2',
      type: 'code',
      content: 'const jwt = require("jsonwebtoken");\n\nfunction authenticateToken(req, res, next) {\n  const authHeader = req.headers["authorization"];\n  const token = authHeader && authHeader.split(" ")[1];\n  \n  if (token == null) return res.sendStatus(401);\n\n  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {\n    if (err) return res.sendStatus(403);\n    req.user = user;\n    next();\n  });\n}',
      order_index: 1,
      metadata: { language: 'javascript' },
      created_at: new Date().toISOString(),
    },
  ],
  'cap-theorem-explained': [
    {
      id: 'b-cap-1',
      note_id: 'n3',
      type: 'text',
      content: 'In theoretical computer science, the CAP theorem states that a distributed data store can simultaneously provide at most two of the three guarantees: Consistency, Availability, and Partition Tolerance.',
      order_index: 0,
      metadata: {},
      created_at: new Date().toISOString(),
    },
  ],
  'reading-list-q1-2025': [
    {
      id: 'b-read-1',
      note_id: 'n6',
      type: 'text',
      content: 'This private note contains sensitive planning lists for Q1 2025 technology books and research papers.',
      order_index: 0,
      metadata: {},
      created_at: new Date().toISOString(),
    },
  ],
}

export function NoteDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const authCtx = use(AuthContext)
  const user = authCtx?.profile ?? null
  const userEmail = authCtx?.user?.email ?? ''

  // Locate the note by slug
  const note = mockNotes.find(n => n.slug === slug)

  if (!note) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: '120px 0', color: 'var(--color-text-muted)' }}>
          <h2>404 — Note Not Found</h2>
          <p>The note you are looking for does not exist or has been deleted.</p>
          <Link to="/notes" style={{ color: 'var(--color-accent)' }}>Back to public notes</Link>
        </div>
      </PageLayout>
    )
  }

  // Security Check (Cascading authorization)
  const isAuthorized = hasNoteAccess(
    note.id,
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
              This note is private
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--line-height-normal)', marginBottom: 'var(--space-6)' }}>
              You do not have access to view this note. If you believe this is a mistake, request access from the owner or switch to an invited account.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {!user ? (
                <>
                  <Button variant="primary" onClick={() => navigate('/login')}>
                    Sign in to request access
                  </Button>
                  <Link to="/notes" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)', textDecoration: 'none' }}>
                    Browse other public notes
                  </Link>
                </>
              ) : (
                <>
                  <Badge variant="muted" style={{ padding: '8px', marginBottom: 'var(--space-3)' }}>
                    Logged in as: {userEmail}
                  </Badge>
                  <Button variant="secondary" onClick={() => navigate('/notes')}>
                    Browse public notes
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </PageLayout>
    )
  }

  // Get blocks
  const blocks: NoteBlock[] = INITIAL_NOTE_BLOCKS[note.slug] ?? [
    {
      id: 'default-text',
      note_id: note.id,
      type: 'text',
      content: note.description || 'This note has no additional content yet.',
      order_index: 0,
      metadata: {},
      created_at: new Date().toISOString(),
    }
  ]

  return (
    <PageLayout>
      <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-24)' }}>
        
        {/* Navigation Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-8)' }}>
          <Link to="/notes" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Notes</Link>
          <span style={{ color: 'var(--color-border-strong)' }}>/</span>
          {note.folder && (
            <>
              <Link to={`/folder/${note.folder.slug}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                {note.folder.title}
              </Link>
              <span style={{ color: 'var(--color-border-strong)' }}>/</span>
            </>
          )}
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-semibold)' }}>
            {note.title}
          </span>
        </div>

        {/* Note Metadata Card */}
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <Badge variant={note.visibility === 'public' ? 'accent' : 'muted'}>
              {note.visibility === 'public' ? '🌎 Public' : '🔒 Private'}
            </Badge>
            {note.folder && <Badge variant="default">📁 {note.folder.title}</Badge>}
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Updated {new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <h1 style={{
            fontSize: 'var(--font-size-4xl)',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: 'var(--letter-spacing-tight)',
            lineHeight: 'var(--line-height-tight)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-4)',
          }}>
            {note.title}
          </h1>

          {note.description && (
            <p style={{
              fontSize: 'var(--font-size-lg)',
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--line-height-normal)',
              margin: 0,
            }}>
              {note.description}
            </p>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-subtle)', margin: 'var(--space-8) 0' }} />

        {/* Content Blocks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {blocks.map(block => {
            if (block.type === 'text') {
              return (
                <p 
                  key={block.id}
                  style={{
                    fontSize: 'var(--font-size-base)',
                    lineHeight: '1.75',
                    color: 'var(--color-text-primary)',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {block.content}
                </p>
              )
            }

            if (block.type === 'code') {
              return (
                <div 
                  key={block.id}
                  style={{
                    background: 'var(--color-code-bg)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-5)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-code-text)',
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                    lineHeight: '1.6',
                  }}
                >
                  {block.content}
                </div>
              )
            }

            if (block.type === 'image') {
              return (
                <div key={block.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <img
                    src={block.content}
                    alt={block.metadata?.alt || 'Note Image'}
                    style={{
                      width: '100%',
                      maxHeight: '480px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-xl)',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                  {block.metadata?.caption && (
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      {block.metadata.caption}
                    </span>
                  )}
                </div>
              )
            }

            if (block.type === 'video') {
              return (
                <div key={block.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{
                    position: 'relative',
                    paddingBottom: '56.25%',
                    height: 0,
                    overflow: 'hidden',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--color-border)',
                  }}>
                    <iframe
                      src={block.content}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        border: 'none',
                      }}
                      allowFullScreen
                      title="Video Embed"
                    />
                  </div>
                  {block.metadata?.caption && (
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      {block.metadata.caption}
                    </span>
                  )}
                </div>
              )
            }

            return null
          })}
        </div>
      </div>
    </PageLayout>
  )
}
