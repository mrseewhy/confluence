import { Link } from 'react-router-dom'

const footerLinks = {
  Product: [
    { label: 'Folders',  href: '/folders' },
    { label: 'Notes',    href: '/notes'   },
  ],
  Account: [
    { label: 'Sign in',  href: '/login'   },
    { label: 'Sign up',  href: '/signup'  },
  ],
  Legal: [
    { label: 'Privacy',  href: '/privacy' },
    { label: 'Terms',    href: '/terms'   },
  ],
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{
      borderTop: '1px solid var(--color-border)',
      background: 'var(--color-bg-base)',
      padding: 'var(--space-16) var(--space-6) var(--space-8)',
      marginTop: 'auto',
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
      }}>

        {/* Top row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 'var(--space-10)',
          marginBottom: 'var(--space-12)',
        }}>

          {/* Brand */}
          <div>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              letterSpacing: 'var(--letter-spacing-tight)',
              color: 'var(--color-text-primary)',
              display: 'block',
              marginBottom: 'var(--space-3)',
            }}>
              confluence
            </span>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-muted)',
              lineHeight: 'var(--line-height-normal)',
              maxWidth: '220px',
              margin: 0,
            }}>
              Create, organise, and share structured notes with anyone.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <p style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                letterSpacing: 'var(--letter-spacing-wider)',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--space-4)',
                fontFamily: 'var(--font-sans)',
              }}>
                {group}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {links.map(link => (
                  <Link
                    key={link.href}
                    to={link.href}
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      textDecoration: 'none',
                      transition: 'color var(--duration-fast) var(--ease-default)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}>
          <p style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            margin: 0,
            fontFamily: 'var(--font-mono)',
          }}>
            © {year} confluence. All rights reserved.
          </p>
          <p style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            margin: 0,
          }}>
            Built with ♥ and too much coffee.
          </p>
        </div>
      </div>
    </footer>
  )
}
