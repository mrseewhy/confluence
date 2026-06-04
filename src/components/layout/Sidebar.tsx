import { } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Profile } from '@/types'

// ── Icons (inline SVG — no extra dep) ────────────────────────

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const Icons = {
  dashboard:  'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  folder:     'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  subfolder:  'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z M9 13h6 M12 10v6',
  notes:      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  settings:   'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  logout:     'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  shield:     'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  chevron:    'M9 18l6-6-6-6',
  globe:      'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z',
}

// ── Nav items ─────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  iconPath: string
  adminOnly?: boolean
  badge?: string
}

const navItems: NavItem[] = [
  { label: 'Overview',   href: '/dashboard',            iconPath: Icons.dashboard  },
  { label: 'Folders',    href: '/dashboard/folders',    iconPath: Icons.folder     },
  { label: 'Subfolders', href: '/dashboard/subfolders', iconPath: Icons.subfolder  },
  { label: 'Notes',      href: '/dashboard/notes',      iconPath: Icons.notes      },
]

const bottomItems: NavItem[] = [
  { label: 'Settings',  href: '/dashboard/settings', iconPath: Icons.settings },
]

// ── Sidebar ───────────────────────────────────────────────────

interface SidebarProps {
  user: Profile
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ user, collapsed, onToggle }: SidebarProps) {
  const location = useLocation()

  const isActive = (href: string) =>
    href === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(href)

  function NavLink({ item }: { item: NavItem }) {
    const active = isActive(item.href)

    return (
      <Link
        to={item.href}
        title={collapsed ? item.label : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: collapsed ? 'var(--space-3)' : 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-lg)',
          textDecoration: 'none',
          fontSize: 'var(--font-size-sm)',
          fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
          color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          background: active ? 'var(--color-accent-subtle)' : 'transparent',
          border: `1px solid ${active ? 'var(--color-accent-muted)' : 'transparent'}`,
          transition: 'all var(--duration-fast) var(--ease-default)',
          justifyContent: collapsed ? 'center' : 'flex-start',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = 'var(--color-bg-muted)'
            e.currentTarget.style.color = 'var(--color-text-primary)'
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--color-text-secondary)'
          }
        }}
      >
        <span style={{ flexShrink: 0, color: active ? 'var(--color-accent)' : 'inherit' }}>
          <Icon d={item.iconPath} />
        </span>
        {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
        {!collapsed && item.adminOnly && (
          <span style={{
            fontSize: '10px',
            fontWeight: 'var(--font-weight-semibold)',
            letterSpacing: '0.06em',
            color: 'var(--color-warning)',
            background: 'var(--color-warning-subtle)',
            border: '1px solid var(--color-warning)',
            padding: '1px 5px',
            borderRadius: 'var(--radius-full)',
          }}>
            ADMIN
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside style={{
      width: collapsed ? '64px' : '240px',
      minHeight: '100vh',
      background: 'var(--color-bg-subtle)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width var(--duration-normal) var(--ease-default)',
      flexShrink: 0,
      overflow: 'hidden',
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>

      {/* Logo + collapse toggle */}
      <div style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '0' : '0 var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <Link to="/" style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-bold)',
            letterSpacing: 'var(--letter-spacing-tight)',
            color: 'var(--color-text-primary)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}>
            confluence
          </Link>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all var(--duration-fast) var(--ease-default)',
            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          }}
        >
          <Icon d={Icons.chevron} size={14} />
        </button>
      </div>

      {/* Admin badge */}
      {user.user_type === 'admin' && !collapsed && (
        <div style={{
          margin: 'var(--space-3) var(--space-3) 0',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-warning-subtle)',
          border: '1px solid var(--color-warning)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
        }}>
          <Icon d={Icons.shield} size={14} />
          <span style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-warning)',
            letterSpacing: '0.05em',
          }}>
            ADMIN
          </span>
        </div>
      )}
      {user.user_type === 'admin' && collapsed && (
        <div style={{
          margin: 'var(--space-3) auto 0',
          color: 'var(--color-warning)',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <Icon d={Icons.shield} size={16} />
        </div>
      )}

      {/* Main nav */}
      <nav style={{
        flex: 1,
        padding: 'var(--space-4) var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {!collapsed && (
          <p style={{
            fontSize: '10px',
            fontWeight: 'var(--font-weight-semibold)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            padding: '0 var(--space-3)',
            marginBottom: 'var(--space-1)',
          }}>
            Navigation
          </p>
        )}
        {navItems
          .filter(item => !item.adminOnly || user.user_type === 'admin')
          .map(item => <NavLink key={item.href} item={item} />)}
      </nav>

      {/* Bottom section */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
      }}>
        {bottomItems.map(item => <NavLink key={item.href} item={item} />)}

        {/* User info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: collapsed ? 'var(--space-3)' : 'var(--space-3) var(--space-4)',
          marginTop: 'var(--space-1)',
          borderTop: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-bold)',
            color: '#fff',
            flexShrink: 0,
          }}>
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0,
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.full_name}
              </p>
              <p style={{
                margin: 0,
                fontSize: '10px',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {user.user_type}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
