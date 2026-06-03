import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui'
import { useAuth } from '@/context/auth'

const navLinks = [
  { label: 'Folders', href: '/folders' },
  { label: 'Notes',   href: '/notes'   },
]

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { dashboardPath, signOut, status } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string) => location.pathname === href
  const isSignedIn = status === 'authenticated'

  const handleSignOut = async () => {
    await signOut()
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 'var(--z-overlay)' as unknown as number,
      background: 'var(--color-bg-base)',
      borderBottom: '1px solid var(--color-border)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <nav style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 var(--space-6)',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-6)',
      }}>

        {/* Logo */}
        <Link to="/" style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-bold)',
          letterSpacing: 'var(--letter-spacing-tight)',
          color: 'var(--color-text-primary)',
          textDecoration: 'none',
          flexShrink: 0,
        }}>
          confluence
        </Link>

        {/* Desktop nav links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          flex: 1,
        }}
          className="desktop-nav"
        >
          {navLinks.map(link => (
            <Link
              key={link.href}
              to={link.href}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: isActive(link.href) ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
                color: isActive(link.href) ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                textDecoration: 'none',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: isActive(link.href) ? 'var(--color-bg-muted)' : 'transparent',
                transition: 'all var(--duration-fast) var(--ease-default)',
              }}
              onMouseEnter={e => {
                if (!isActive(link.href)) {
                  (e.target as HTMLElement).style.background = 'var(--color-bg-subtle)'
                  ;(e.target as HTMLElement).style.color = 'var(--color-text-primary)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive(link.href)) {
                  (e.target as HTMLElement).style.background = 'transparent'
                  ;(e.target as HTMLElement).style.color = 'var(--color-text-secondary)'
                }
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          flexShrink: 0,
        }}>
          <ThemeToggle />

          <div className="desktop-nav" style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {isSignedIn ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>Log out</Button>
                <Link to={dashboardPath}>
                  <Button variant="primary" size="sm">Dashboard</Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Toggle menu"
            className="mobile-menu-btn"
            style={{
              display: 'none',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              fontSize: '18px',
              lineHeight: 1,
            }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg-base)',
          padding: 'var(--space-4) var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}
          className="mobile-menu"
        >
          {navLinks.map(link => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--font-size-base)',
                fontWeight: isActive(link.href) ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
                color: isActive(link.href) ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                textDecoration: 'none',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: isActive(link.href) ? 'var(--color-accent-subtle)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
          {isSignedIn ? (
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="secondary" size="md" fullWidth onClick={handleSignOut}>Log out</Button>
              <Link to={dashboardPath} style={{ flex: 1 }} onClick={() => setMenuOpen(false)}>
                <Button variant="primary" size="md" fullWidth>Dashboard</Button>
              </Link>
            </div>
          ) : (
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
              <Link to="/login" style={{ flex: 1 }} onClick={() => setMenuOpen(false)}>
                <Button variant="secondary" size="md" fullWidth>Sign in</Button>
              </Link>
              <Link to="/signup" style={{ flex: 1 }} onClick={() => setMenuOpen(false)}>
                <Button variant="primary" size="md" fullWidth>Get started</Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  )
}
