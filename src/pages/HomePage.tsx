import { Link } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button, Badge, Card } from '@/components/ui'
import { mockFolders, mockNotes } from '@/lib/mockData'

// ── Feature card data ────────────────────────────────────────

const features = [
  {
    icon: '📁',
    title: 'Folders & Subfolders',
    description: 'Organise your notes into folders and subfolders. Build any hierarchy that fits your mental model.',
  },
  {
    icon: '⚡',
    title: 'Block-based Editor',
    description: 'Mix text, code, images, and videos in a single note. Every block renders exactly as intended.',
  },
  {
    icon: '🔒',
    title: 'Public or Private',
    description: 'Keep notes private for yourself or share them publicly with a clean, permanent URL.',
  },
  {
    icon: '💻',
    title: 'Syntax Highlighting',
    description: 'Code blocks with language-aware highlighting. Supports dozens of programming languages.',
  },
  {
    icon: '🔗',
    title: 'Shareable Links',
    description: 'Every public note gets a clean slug-based URL you can drop into any chat or email.',
  },
  {
    icon: '🌐',
    title: 'Works for Everyone',
    description: 'Docs, tutorials, research, onboarding — confluence adapts to how you think and work.',
  },
]

export function HomePage() {
  const publicFolders = mockFolders.filter(f => f.visibility === 'public').slice(0, 3)
  const publicNotes   = mockNotes.filter(n => n.visibility === 'public').slice(0, 3)

  return (
    <PageLayout>
      {/* ── Hero ── */}
      <section style={{
        paddingTop: 'var(--space-24)',
        paddingBottom: 'var(--space-24)',
        textAlign: 'center',
      }}>
        <Badge variant="accent" style={{ marginBottom: 'var(--space-6)' }}>
          Now in beta
        </Badge>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 'var(--font-weight-bold)',
          letterSpacing: 'var(--letter-spacing-tight)',
          lineHeight: 'var(--line-height-tight)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-6)',
          maxWidth: '760px',
          margin: '0 auto var(--space-6)',
        }}>
          Notes that are worth
          <br />
          <span style={{ color: 'var(--color-accent)' }}>sharing.</span>
        </h1>

        <p style={{
          fontSize: 'var(--font-size-lg)',
          color: 'var(--color-text-secondary)',
          lineHeight: 'var(--line-height-normal)',
          maxWidth: '560px',
          margin: '0 auto var(--space-10)',
        }}>
          Create rich notes with text, code, images, and video.
          Organise them into folders. Share them with the world — or keep them private.
        </p>

        <div style={{
          display: 'flex',
          gap: 'var(--space-3)',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <Link to="/signup">
            <Button variant="primary" size="lg">Start for free</Button>
          </Link>
          <Link to="/folders">
            <Button variant="secondary" size="lg">Browse notes</Button>
          </Link>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section style={{ paddingBottom: 'var(--space-24)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
          <h2 style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: 'var(--letter-spacing-tight)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-3)',
          }}>
            Everything you need, nothing you don't
          </h2>
          <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-secondary)', margin: 0 }}>
            Designed for developers, teachers, writers, and thinkers.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-4)',
        }}>
          {features.map(feature => (
            <Card key={feature.title} hoverable>
              <div style={{ fontSize: '28px', marginBottom: 'var(--space-3)' }}>
                {feature.icon}
              </div>
              <h4 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                {feature.title}
              </h4>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{
        paddingBottom: 'var(--space-24)',
        borderTop: '1px solid var(--color-border)',
        paddingTop: 'var(--space-16)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
          <h2 style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: 'var(--letter-spacing-tight)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-3)',
          }}>
            How it works
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-6)',
        }}>
          {[
            { step: '01', title: 'Create a folder', description: 'Group related notes under a topic, project, or subject.' },
            { step: '02', title: 'Add subfolders', description: 'Break it down further with nested subfolders for better organisation.' },
            { step: '03', title: 'Write your notes', description: 'Use text, code, images, and video blocks to build rich content.' },
            { step: '04', title: 'Share or keep private', description: 'Control visibility per folder and per note.' },
          ].map(item => (
            <div key={item.step} style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-accent)',
                letterSpacing: 'var(--letter-spacing-wider)',
                display: 'block',
                marginBottom: 'var(--space-3)',
              }}>
                {item.step}
              </span>
              <h4 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                {item.title}
              </h4>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Public folders preview ── */}
      <section style={{
        paddingBottom: 'var(--space-24)',
        borderTop: '1px solid var(--color-border)',
        paddingTop: 'var(--space-16)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-8)',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}>
          <div>
            <h2 style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              letterSpacing: 'var(--letter-spacing-tight)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-1)',
            }}>
              Recent folders
            </h2>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              Shared publicly by the community.
            </p>
          </div>
          <Link to="/folders">
            <Button variant="secondary" size="sm">View all →</Button>
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-4)',
        }}>
          {publicFolders.map(folder => (
            <Link key={folder.id} to={`/folder/${folder.slug}`} style={{ textDecoration: 'none' }}>
              <Card hoverable>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                  <span style={{ fontSize: '24px' }}>📁</span>
                  <Badge variant="accent">{folder.note_count} notes</Badge>
                </div>
                <h4 style={{ marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
                  {folder.title}
                </h4>
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  {folder.description}
                </p>
                {folder.subfolders && folder.subfolders.length > 0 && (
                  <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {folder.subfolders.map(sf => (
                      <Badge key={sf.id} variant="muted">📂 {sf.title}</Badge>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Recent notes preview ── */}
      <section style={{
        paddingBottom: 'var(--space-24)',
        borderTop: '1px solid var(--color-border)',
        paddingTop: 'var(--space-16)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-8)',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}>
          <div>
            <h2 style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              letterSpacing: 'var(--letter-spacing-tight)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-1)',
            }}>
              Recent notes
            </h2>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              Latest public notes from the community.
            </p>
          </div>
          <Link to="/notes">
            <Button variant="secondary" size="sm">View all →</Button>
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {publicNotes.map(note => (
            <Link key={note.id} to={`/n/${note.slug}`} style={{ textDecoration: 'none' }}>
              <Card hoverable style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-6)' }}>
                <div>
                  <h5 style={{ marginBottom: 'var(--space-1)', color: 'var(--color-text-primary)' }}>
                    {note.title}
                  </h5>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                    {note.description}
                  </p>
                </div>
                {note.folder && (
                  <Badge variant="muted" style={{ flexShrink: 0 }}>
                    {note.folder.title}
                  </Badge>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        paddingBottom: 'var(--space-24)',
        paddingTop: 'var(--space-4)',
      }}>
        <div style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-16) var(--space-8)',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
        }}>
          <h2 style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: 'var(--letter-spacing-tight)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-4)',
          }}>
            Ready to get started?
          </h2>
          <p style={{
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-8)',
            maxWidth: '400px',
            margin: '0 auto var(--space-8)',
          }}>
            Create your first note in under a minute. Free forever.
          </p>
          <Link to="/signup">
            <Button variant="primary" size="lg">Create your account →</Button>
          </Link>
        </div>
      </section>
    </PageLayout>
  )
}
