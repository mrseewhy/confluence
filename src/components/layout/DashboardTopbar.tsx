import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { Profile } from '@/types'

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

// Map pathname → readable breadcrumb
const routeLabels: Record<string, string> = {
  '/dashboard':             'Overview',
  '/dashboard/folders':     'Folders',
  '/dashboard/subfolders':  'Subfolders',
  '/dashboard/notes':       'Notes',
  '/dashboard/settings':    'Settings',
}

interface DashboardTopbarProps {
  user: Profile
}

export function DashboardTopbar({ user }: DashboardTopbarProps) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const pageLabel = routeLabels[location.pathname] ?? 'Dashboard'

  return (
    <header style={{
      height: '60px',
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--space-6)',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 'var(--z-raised)' as unknown as number,
    }}>

      {/* Left: breadcrumb */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-muted)',
      }}>
        <Link to="/dashboard" style={{
          color: 'var(--color-text-muted)',
          textDecoration: 'none',
          transition: 'color var(--duration-fast)',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
        >
          Dashboard
        </Link>
        {pageLabel !== 'Overview' && (
          <>
            <span style={{ color: 'var(--color-border-strong)' }}>/</span>
            <span style={{
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
            }}>
              {pageLabel}
            </span>
          </>
        )}
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <ThemeToggle />

        {/* User menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(p => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-elevated)',
              cursor: 'pointer',
              transition: 'all var(--duration-fast) var(--ease-default)',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-border-strong)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 'var(--font-weight-bold)',
              color: '#fff',
              flexShrink: 0,
            }}>
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <span style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user.full_name}
            </span>
            <span style={{ color: 'var(--color-text-muted)' }}>
              <Icon d="M6 9l6 6 6-6" size={14} />
            </span>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                onClick={() => setMenuOpen(false)}
              />
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '220px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 100,
                overflow: 'hidden',
                padding: 'var(--space-2)',
              }}>
                {/* User info */}
                <div style={{
                  padding: 'var(--space-3) var(--space-3)',
                  borderBottom: '1px solid var(--color-border)',
                  marginBottom: 'var(--space-2)',
                }}>
                  <p style={{
                    margin: 0,
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                  }}>
                    {user.full_name}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '10px',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginTop: '2px',
                  }}>
                    {user.user_type}
                  </p>
                </div>

                {/* Menu items */}
                {[
                  { label: 'Settings', href: '/dashboard/settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
                  { label: 'View public profile', href: '/', icon: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z' },
                ].map(item => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      transition: 'all var(--duration-fast)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--color-bg-muted)'
                      e.currentTarget.style.color = 'var(--color-text-primary)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--color-text-secondary)'
                    }}
                  >
                    <Icon d={item.icon} size={15} />
                    {item.label}
                  </Link>
                ))}

                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-danger)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                      transition: 'all var(--duration-fast)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-danger-subtle)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" size={15} />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
