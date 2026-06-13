import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/layout/PageLayout'
import { useAuth } from '@/context/auth'

export function AuthRedirectPage() {
  const navigate = useNavigate()
  const { dashboardPath, status } = useAuth()
  const hasNavigated = useRef(false)

  useEffect(() => {
    // Guard against React Strict Mode double-firing in development
    if (hasNavigated.current) return

    if (status === 'authenticated') {
      hasNavigated.current = true
      navigate(dashboardPath, { replace: true })
    }

    if (status === 'unauthenticated') {
      hasNavigated.current = true
      navigate('/login', { replace: true })
    }
  }, [dashboardPath, navigate, status])

  return (
    <PageLayout noFooter>
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
        fontSize: 'var(--font-size-sm)',
      }}>
        Redirecting…
      </div>
    </PageLayout>
  )
}
