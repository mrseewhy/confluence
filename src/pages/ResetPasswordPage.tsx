import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button } from '@/components/ui'
import { PasswordInput } from '@/components/PasswordInput'
import { requireSupabase } from '@/lib/supabase'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Verify that there is a session. Supabase will put the access token in the hash,
  // which the client SDK processes to establish a session.
  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = requireSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('No active reset session. Please request another password recovery email.')
        }
      } catch {
        setError('Database connection error.')
      }
    }
    void checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = requireSupabase()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayout>
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-12) var(--space-4)',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <div style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'var(--space-10)',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
              <div style={{
                width: '44px', height: '44px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-accent-subtle)',
                border: '1px solid var(--color-accent-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto var(--space-5)',
                fontSize: '20px',
              }}>✦</div>
              <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', letterSpacing: 'var(--letter-spacing-tight)', marginBottom: 'var(--space-2)' }}>
                Set new password
              </h2>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Enter your new password below.
              </p>
            </div>

            {error && (
              <div style={{ background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ background: 'var(--color-success-subtle)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-success)' }}>
                Password updated successfully! Redirecting to dashboard...
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <PasswordInput
                  label="New Password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => { setError(''); setPassword(e.target.value) }}
                  autoComplete="new-password"
                  required
                />

                <PasswordInput
                  label="Confirm New Password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={e => { setError(''); setConfirmPassword(e.target.value) }}
                  autoComplete="new-password"
                  required
                />

                <Button type="submit" variant="primary" size="md" fullWidth disabled={loading || !password || !confirmPassword}>
                  {loading ? 'Updating password…' : 'Update password'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
