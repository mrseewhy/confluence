import { Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Icon } from '@/components/layout/DashboardIcon'
import { IC } from '@/components/layout/dashboardIconPaths'
import { Badge, Button } from '@/components/ui'
import { mockCurrentUser, mockFolders, mockNotes } from '@/lib/mockData'
import type { Profile } from '@/types'

// Mock users for admin view
const mockUsers: (Profile & { email: string; notes: number; folders: number })[] = [
  { id: 'user-1', full_name: 'Alex Johnson',   email: 'alex@example.com',  user_type: 'admin', avatar_url: null, created_at: '2024-10-01T00:00:00Z', notes: 6, folders: 4 },
  { id: 'user-2', full_name: 'Maria Santos',   email: 'maria@example.com', user_type: 'user',  avatar_url: null, created_at: '2024-11-05T00:00:00Z', notes: 3, folders: 2 },
  { id: 'user-3', full_name: 'James Okonkwo',  email: 'james@example.com', user_type: 'user',  avatar_url: null, created_at: '2024-11-20T00:00:00Z', notes: 8, folders: 5 },
  { id: 'user-4', full_name: 'Priya Mehta',    email: 'priya@example.com', user_type: 'user',  avatar_url: null, created_at: '2024-12-01T00:00:00Z', notes: 1, folders: 1 },
]

function StatCard({ label, value, icon, sub }: { label: string; value: string | number; icon: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)', boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>{label}</span>
        <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-lg)', background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)' }}>
          <Icon d={icon} size={15} />
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)', letterSpacing: 'var(--letter-spacing-tight)', color: 'var(--color-text-primary)' }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>{sub}</p>}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AdminOverview() {
  const user        = mockCurrentUser
  const rootFolders = mockFolders.filter(f => f.parent_id === null)
  const subfolders  = mockFolders.filter(f => f.parent_id !== null)
  const recentUsers = [...mockUsers].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)

  return (
    <DashboardLayout user={user} variant="admin">

      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: 'var(--radius-md)', background: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)' }}>
            <Icon d={IC.shield} size={14} />
          </div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', letterSpacing: 'var(--letter-spacing-tight)', margin: 0 }}>Admin overview</h1>
        </div>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Platform-wide stats and recent activity.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <StatCard label="Total users"    value={mockUsers.length}    icon={IC.users}     sub="across all accounts" />
        <StatCard label="Total folders"  value={rootFolders.length}  icon={IC.folder}    sub={`+ ${subfolders.length} subfolders`} />
        <StatCard label="Total notes"    value={mockNotes.length}    icon={IC.notes}     sub="all visibility" />
        <StatCard label="Public notes"   value={mockNotes.filter(n=>n.visibility==='public').length}  icon={IC.globe} sub="publicly accessible" />
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }} className="admin-grid">

        {/* Recent users */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>Recent users</h3>
            <Link to="/admin/dashboard/users"><Button variant="ghost" size="xs">View all →</Button></Link>
          </div>
          <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            {recentUsers.map((u, i) => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-4)', gap: 'var(--space-3)',
                borderBottom: i < recentUsers.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-full)', background: u.user_type === 'admin' ? 'var(--color-warning)' : 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'var(--font-weight-bold)', color: '#fff', flexShrink: 0 }}>
                    {u.full_name.charAt(0)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name}</p>
                    <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(u.created_at)}</p>
                  </div>
                </div>
                <Badge variant={u.user_type === 'admin' ? 'warning' : 'default'}>{u.user_type}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent notes */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>Recent notes</h3>
            <Link to="/admin/dashboard/notes"><Button variant="ghost" size="xs">View all →</Button></Link>
          </div>
          <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            {mockNotes.slice(0, 5).map((note, i) => (
              <div key={note.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-4)', gap: 'var(--space-3)',
                borderBottom: i < 4 ? '1px solid var(--color-border-subtle)' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</p>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{note.folder?.title}</p>
                </div>
                <Badge variant={note.visibility === 'public' ? 'accent' : 'muted'}>{note.visibility}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 768px) { .admin-grid { grid-template-columns: 1fr !important; } }`}</style>
    </DashboardLayout>
  )
}
