import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getDashboardPath, useAuth } from '@/context/auth'
import type { UserType } from '@/types'

interface RequireAuthProps {
  children: ReactNode
  userType?: UserType
}

export function RequireAuth({ children, userType }: RequireAuthProps) {
  const { profile, status } = useAuth()

  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-base)',
        color: 'var(--color-text-muted)',
        fontSize: 'var(--font-size-sm)',
      }}>
        Loading…
      </div>
    )
  }

  if (status === 'unauthenticated' || !profile) {
    return <Navigate to="/login" replace />
  }

  if (userType && profile.user_type !== userType) {
    // Admins can access both admin and user routes (admin is additive)
    if (!(userType === 'user' && profile.user_type === 'admin')) {
      return <Navigate to={getDashboardPath(profile.user_type)} replace />
    }
  }

  return children
}
