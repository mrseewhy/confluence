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

/** Create a fallback Profile for loading/error states */
export function fallbackProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: '',
    full_name: 'Loading...',
    username: '',
    avatar_url: null,
    user_type: 'user',
    subscription_tier: 'free',
    is_banned: false,
    created_at: '',
    ...overrides,
  }
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.')
  }

  return context
}
