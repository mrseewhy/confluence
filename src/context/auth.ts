import { createContext, use } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile, UserType } from '@/types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  user: User | null
  profile: Profile | null
  status: AuthStatus
  signInWithEmail: (email: string, password: string) => Promise<Profile>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<Profile | null>
  dashboardPath: string
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function getDashboardPath(userType?: UserType | null) {
  return userType === 'admin' ? '/admin/dashboard' : '/dashboard'
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.')
  }

  return context
}
