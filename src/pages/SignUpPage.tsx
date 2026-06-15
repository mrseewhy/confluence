import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button, Input, Divider } from '@/components/ui'
import { PasswordInput } from '@/components/PasswordInput'
import { useAuth } from '@/context/auth'
import { requireSupabase } from '@/lib/supabase'
import { SeoHead } from '@/components/SeoHead'

export function SignUpPage() {
  const { signInWithGoogle } = useAuth()
  const [form, setForm]       = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [message, setMessage] = useState('')

  const passwordStrength = (pw: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    if (score <= 2) return { score, label: 'Weak', color: 'var(--color-danger)' };
    if (score <= 4) return { score, label: 'Medium', color: 'var(--color-warning)' };
    return { score, label: 'Strong', color: 'var(--color-success)' };
  };

  const strength = passwordStrength(form.password);



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

    if (strength.score < 3) {
      setError('Password is too weak. Use at least 8 characters with a mix of uppercase, lowercase, numbers, and symbols.')
      setLoading(false)
      return
    }

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
      <SeoHead title="Sign Up" description="Create a Confluence account to start taking collaborative notes." />
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
              <PasswordInput
                label="Password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={handleChange('password')}
                autoComplete="new-password"
                hint="Use at least 8 characters with a mix of letters, numbers, and symbols."
                required
              />
              {form.password.length > 0 && (
                <div style={{ marginTop: "-var(--space-2)" }}>
                  <div style={{ display: "flex", gap: "var(--space-1)", marginBottom: "2px" }}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: "3px",
                          borderRadius: "2px",
                          background: i <= strength.score ? strength.color : "var(--color-bg-muted)",
                          transition: "background var(--duration-fast)",
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: "11px", color: strength.color, fontWeight: "var(--font-weight-medium)" }}>
                    {strength.label}
                  </span>
                </div>
              )}
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
