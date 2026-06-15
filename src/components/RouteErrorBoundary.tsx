import { Suspense, type ReactNode } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function RouteSkeleton() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <div style={{
        width: 28,
        height: 28,
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-accent)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

interface RouteErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Wraps a lazy-loaded route with both ErrorBoundary and Suspense,
 * so that errors in one route don't crash the entire app and
 * each route shows its own loading skeleton.
 */
export function RouteErrorBoundary({ children, fallback }: RouteErrorBoundaryProps) {
  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={<RouteSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}
