import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { Button, Input } from '@/components/ui'
import { requireSupabase } from '@/lib/supabase'

type Step = 'request' | 'sent'

export function PasswordRecoveryPage() {
  const [email, setEmail]     = useState('')
  const [step, setStep]       = useState<Step>('request')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = requireSupabase()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      })

      if (error) throw error

      setStep('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send a recovery link.')
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
            {step === 'sent' ? (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-full)', background: 'var(--color-success-subtle)', border: '1px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>✉️</div>
                <div>
                  <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', letterSpacing: 'var(--letter-spacing-tight)', marginBottom: 'var(--space-2)' }}>Check your email</h2>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>We sent a recovery link to <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong></p>
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
                  Didn't receive it?{' '}
                  <button onClick={() => setStep('request')} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'var(--font-sans)', fontWeight: 'var(--font-weight-medium)', padding: 0 }}>
                    Try again
                  </button>
                </p>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-lg)', background: 'var(--color-accent-subtle)', border: '1px solid var(--color-accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-5)', fontSize: '20px' }}>🔑</div>
                  <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', letterSpacing: 'var(--letter-spacing-tight)', marginBottom: 'var(--space-2)' }}>Reset your password</h2>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Enter your email and we'll send you a recovery link.</p>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {error && (
                    <div style={{ background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)' }}>
                      {error}
                    </div>
                  )}
                  <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={e => { setError(''); setEmail(e.target.value) }} autoComplete="email" hint="We'll send a reset link to this address." required />
                  <Button type="submit" variant="primary" size="md" fullWidth disabled={loading || !email}>
                    {loading ? 'Sending…' : 'Send recovery link'}
                  </Button>
                  <Link to="/login"><Button type="button" variant="ghost" size="sm" fullWidth>← Back to sign in</Button></Link>
                </form>
              </>
            )}
          </div>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            Remember it?{' '}
            <Link to="/login" style={{ color: 'var(--color-accent)', fontWeight: 'var(--font-weight-medium)' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
