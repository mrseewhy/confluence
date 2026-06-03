import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Icon } from '@/components/layout/DashboardIcon'
import { IC } from '@/components/layout/dashboardIconPaths'
import { Badge, Button, EmptyState } from '@/components/ui'
import { mockCurrentUser } from '@/lib/mockData'
import type { Profile } from '@/types'

// Extended mock users for admin view
const mockUsers: (Profile & { email: string; notes: number; folders: number })[] = [
  { id: 'user-1', full_name: 'Alex Johnson',  email: 'alex@example.com',   user_type: 'admin', avatar_url: null, created_at: '2024-10-01T00:00:00Z', notes: 6, folders: 4 },
  { id: 'user-2', full_name: 'Maria Santos',  email: 'maria@example.com',  user_type: 'user',  avatar_url: null, created_at: '2024-11-05T00:00:00Z', notes: 3, folders: 2 },
  { id: 'user-3', full_name: 'James Okonkwo', email: 'james@example.com',  user_type: 'user',  avatar_url: null, created_at: '2024-11-20T00:00:00Z', notes: 8, folders: 5 },
  { id: 'user-4', full_name: 'Priya Mehta',   email: 'priya@example.com',  user_type: 'user',  avatar_url: null, created_at: '2024-12-01T00:00:00Z', notes: 1, folders: 1 },
  { id: 'user-5', full_name: 'Lena Fischer',  email: 'lena@example.com',   user_type: 'user',  avatar_url: null, created_at: '2024-12-10T00:00:00Z', notes: 4, folders: 3 },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AdminUsers() {
  const user = mockCurrentUser
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<'all' | 'admin' | 'user'>('all')

  const filtered = mockUsers.filter(u => {
    const q = search.toLowerCase()
    return (
      (u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (filter === 'all' || u.user_type === filter)
    )
  })

  return (
    <DashboardLayout user={user} variant="admin">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', letterSpacing: 'var(--letter-spacing-tight)', marginBottom: 'var(--space-1)' }}>Users</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            {mockUsers.length} registered user{mockUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Info banner — role promotion note */}
      <div style={{
        background: 'var(--color-warning-subtle)',
        border: '1px solid var(--color-warning)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3) var(--space-5)',
        marginBottom: 'var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-warning)',
      }}>
        <Icon d={IC.shield} size={16} />
        <span>
          To promote a user to <strong>admin</strong>, update their user_type directly in the Supabase dashboard:{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em', background: 'rgba(0,0,0,0.08)', padding: '1px 6px', borderRadius: '4px' }}>
            UPDATE profiles SET user_type = 'admin' WHERE id = '&lt;user-id&gt;';
          </code>
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 220px', fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)', outline: 'none' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-subtle)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {(['all', 'admin', 'user'] as const).map(v => (
            <Button key={v} variant={filter === v ? 'accent-ghost' : 'secondary'} size="sm" onClick={() => setFilter(v)} style={{ textTransform: 'capitalize' }}>{v}</Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          {/* Head */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 60px 60px 80px 80px', gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)' }}>
            {['User', 'Email', 'Role', 'Notes', 'Folders', 'Joined'].map(h => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{h}</span>
            ))}
          </div>

          {filtered.map((u, i) => (
            <div key={u.id} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 200px 60px 60px 80px 80px',
              gap: 'var(--space-4)',
              alignItems: 'center',
              padding: 'var(--space-4) var(--space-5)',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
              transition: 'background var(--duration-fast)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Name + avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                <div style={{
                  width: '32px', height: '32px',
                  borderRadius: 'var(--radius-full)',
                  background: u.user_type === 'admin' ? 'var(--color-warning)' : 'var(--color-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 'var(--font-weight-bold)', color: '#fff',
                  flexShrink: 0,
                }}>
                  {u.full_name.charAt(0)}
                </div>
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.full_name}
                  {u.id === mockCurrentUser.id && (
                    <span style={{ marginLeft: 'var(--space-2)', fontSize: '10px', color: 'var(--color-text-muted)' }}>(you)</span>
                  )}
                </p>
              </div>

              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
              <Badge variant={u.user_type === 'admin' ? 'warning' : 'default'}>{u.user_type}</Badge>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{u.notes}</span>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{u.folders}</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(u.created_at)}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="👥" title="No users found" description="Try adjusting your search or filters." action={<Button variant="secondary" size="sm" onClick={() => { setSearch(''); setFilter('all') }}>Clear filters</Button>} />
      )}
    </DashboardLayout>
  )
}
