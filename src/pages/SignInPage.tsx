import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button, Input, Divider } from '@/components/ui'
import { PasswordInput } from '@/components/PasswordInput'
import { getDashboardPath, useAuth } from '@/context/auth'
import { SeoHead } from '@/components/SeoHead'

export function SignInPage() {
  const navigate = useNavigate()
  const { signInWithEmail, signInWithGoogle } = useAuth()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')



  const handleChange = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError('')
      setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const profile = await signInWithEmail(form.email, form.password)
      navigate(getDashboardPath(profile.user_type))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')

    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to continue with Google.')
      setLoading(false)
    }
  }

  return (
    <PageLayout>
      <SeoHead title="Sign In" description="Sign in to your Confluence account." />
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-12) var(--space-4)',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Card */}
          <div style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'var(--space-10)',
            boxShadow: 'var(--shadow-lg)',
          }}>
            {/* Header */}
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
                Welcome back
              </h2>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Sign in to access your notes and folders.
              </p>
            </div>

            {/* Google */}
            <Button type="button" variant="secondary" size="md" fullWidth style={{ marginBottom: 'var(--space-5)' }} onClick={handleGoogleSignIn} disabled={loading}
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              }
            >
              Continue with Google
            </Button>

            <Divider style={{ margin: 'var(--space-5) 0' }}>
              <span style={{ background: 'var(--color-bg-elevated)', padding: '0 var(--space-3)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                or sign in with email
              </span>
            </Divider>

            {error && (
              <div style={{ background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange('email')} autoComplete="email" required />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>Password</label>
                  <Link to="/recover" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)', fontWeight: 'var(--font-weight-medium)' }}>Forgot password?</Link>
                </div>
                <PasswordInput
                  label=""
                  placeholder="Your password"
                  value={form.password}
                  onChange={handleChange('password')}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" variant="primary" size="md" fullWidth style={{ marginTop: 'var(--space-2)' }} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--color-accent)', fontWeight: 'var(--font-weight-medium)' }}>Sign up for free</Link>
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
