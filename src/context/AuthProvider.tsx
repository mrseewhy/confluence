import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { AuthContext, getDashboardPath, type AuthStatus } from '@/context/auth'
import { requireSupabase, supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthProviderProps {
  children: ReactNode
}

function generateUsername(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'user';
}

function profileFromUser(user: User): Profile {
  const full_name = user.user_metadata.full_name ?? user.email ?? 'User';
  return {
    id: user.id,
    full_name,
    username: user.user_metadata.username ?? generateUsername(full_name),
    avatar_url: user.user_metadata.avatar_url ?? null,
    user_type: 'user',
    subscription_tier: 'free',
    is_banned: false,
    created_at: user.created_at,
  }
}

async function fetchProfile(user: User): Promise<Profile> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, username, avatar_url, user_type, subscription_tier, is_banned, created_at')
    .eq('id', user.id)
    .single()

  if (!error && data) return data as Profile

  const fallback = profileFromUser(user)
  const { data: created, error: upsertError } = await client
    .from('profiles')
    .upsert(fallback, { onConflict: 'id' })
    .select('id, full_name, username, avatar_url, user_type, subscription_tier, is_banned, created_at')
    .single()

  if (upsertError) throw upsertError

  return created as Profile
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'unauthenticated')

  const loadSession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setUser(null)
      setProfile(null)
      setStatus('unauthenticated')
      return null
    }

    setStatus('loading')
    setUser(session.user)

    try {
      const nextProfile = await fetchProfile(session.user)
      setProfile(nextProfile)
      setStatus('authenticated')
      return nextProfile
    } catch (err) {
      setProfile(null)
      setStatus('unauthenticated')
      throw err
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return

      if (error) {
        setStatus('unauthenticated')
        return
      }

      void loadSession(data.session).catch(() => setStatus('unauthenticated'))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadSession(session).catch(() => setStatus('unauthenticated'))
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadSession])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const client = requireSupabase()
    const { data, error } = await client.auth.signInWithPassword({ email, password })

    if (error) throw error
    if (!data.user) throw new Error('Unable to find the signed-in user.')

    const nextProfile = await fetchProfile(data.user)
    setUser(data.user)
    setProfile(nextProfile)
    setStatus('authenticated')

    return nextProfile
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const client = requireSupabase()
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/redirect`,
      },
    })

    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const client = requireSupabase()
    const { error } = await client.auth.signOut()

    if (error) throw error

    setUser(null)
    setProfile(null)
    setStatus('unauthenticated')
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return null

    const nextProfile = await fetchProfile(user)
    setProfile(nextProfile)
    return nextProfile
  }, [user])

  const value = useMemo(() => ({
    user,
    profile,
    status,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    refreshProfile,
    dashboardPath: getDashboardPath(profile?.user_type),
  }), [profile, refreshProfile, signInWithEmail, signInWithGoogle, signOut, status, user])

  return (
    <AuthContext value={value}>
      {children}
    </AuthContext>
  )
}
