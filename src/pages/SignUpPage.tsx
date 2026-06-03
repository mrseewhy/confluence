import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button, Input, Divider } from '@/components/ui'
import { useAuth } from '@/context/auth'
import { requireSupabase } from '@/lib/supabase'

export function SignUpPage() {
  const { signInWithGoogle } = useAuth()
  const [form, setForm]       = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [message, setMessage] = useState('')

  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError('')
      setMessage('')
      setForm(prev => ({ ...prev, [field]: e.target.value }))
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const supabase = requireSupabase()
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.name,
            user_type: 'user',
          },
          emailRedirectTo: `${window.location.origin}/auth/redirect`,
        },
      })

      if (error) throw error

      setMessage('Check your email to confirm your account.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to continue with Google.')
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
                margin: '0 auto var(--space-5)', fontSize: '20px',
              }}>✦</div>
              <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', letterSpacing: 'var(--letter-spacing-tight)', marginBottom: 'var(--space-2)' }}>
                Create your account
              </h2>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Start organising and sharing notes today.
              </p>
            </div>

            <Button type="button" variant="secondary" size="md" fullWidth style={{ marginBottom: 'var(--space-5)' }} onClick={handleGoogleSignUp} disabled={loading}
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
                or continue with email
              </span>
            </Divider>

            {error && (
              <div style={{ background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)' }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{ background: 'var(--color-success-subtle)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-success)' }}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input label="Full name" type="text" placeholder="Your name" value={form.name} onChange={handleChange('name')} autoComplete="name" required />
              <Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange('email')} autoComplete="email" required />
              <Input 
                label="Password" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="At least 8 characters" 
                value={form.password} 
                onChange={handleChange('password')} 
                autoComplete="new-password" 
                hint="Use at least 8 characters with a mix of letters and numbers." 
                required 
                rightIcon={
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                }
              />
              <Button type="submit" variant="primary" size="md" fullWidth style={{ marginTop: 'var(--space-2)' }} disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </form>

            <p style={{ marginTop: 'var(--space-5)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 'var(--line-height-normal)' }}>
              By creating an account you agree to our{' '}
              <Link to="/terms" style={{ color: 'var(--color-accent)' }}>Terms</Link>{' '}and{' '}
              <Link to="/privacy" style={{ color: 'var(--color-accent)' }}>Privacy Policy</Link>.
            </p>
          </div>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--color-accent)', fontWeight: 'var(--font-weight-medium)' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
