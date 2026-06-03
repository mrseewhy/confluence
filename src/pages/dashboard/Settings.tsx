import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button, Input } from '@/components/ui'
import { mockCurrentUser } from '@/lib/mockData'

export function DashboardSettings() {
  const user = mockCurrentUser
  const [name,  setName]  = useState(user.full_name)
  const [email, setEmail] = useState('alex@example.com')
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <DashboardLayout user={user} variant="user">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', letterSpacing: 'var(--letter-spacing-tight)', marginBottom: 'var(--space-1)' }}>Settings</h1>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Manage your account and preferences.</p>
      </div>

      <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>

        {/* Profile */}
        <section style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', margin: 0, color: 'var(--color-text-primary)' }}>Profile</h3>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '2px' }}>Update your public profile details.</p>
          </div>
          <form onSubmit={handleSave} style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-full)', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: '#fff', flexShrink: 0 }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <Button variant="secondary" size="sm" type="button">Change avatar</Button>
                <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>

            <Input label="Full name" type="text" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} hint="Changing your email requires re-verification." />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Button type="submit" variant="primary" size="sm">Save changes</Button>
              {saved && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>✓ Saved</span>}
            </div>
          </form>
        </section>

        {/* Password */}
        <section style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', margin: 0, color: 'var(--color-text-primary)' }}>Password</h3>
            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '2px' }}>Update your password regularly for security.</p>
          </div>
          <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input label="Current password" type="password" placeholder="••••••••" />
            <Input label="New password"     type="password" placeholder="••••••••" />
            <Input label="Confirm password" type="password" placeholder="••••••••" />
            <div><Button variant="primary" size="sm">Update password</Button></div>
          </div>
        </section>

        {/* Danger zone */}
        <section style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', margin: 0, color: 'var(--color-danger)' }}>Danger zone</h3>
          </div>
          <div style={{ padding: 'var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>Delete account</p>
              <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Permanently delete your account and all data. Cannot be undone.</p>
            </div>
            <Button variant="danger" size="sm">Delete account</Button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
