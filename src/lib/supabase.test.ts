import { describe, it, expect } from 'vitest'
import { supabase, isSupabaseConfigured, requireSupabase } from './supabase'

describe('isSupabaseConfigured', () => {
  it('returns a boolean', () => {
    // This will be true when env vars are set (local dev) or false in CI
    expect(typeof isSupabaseConfigured).toBe('boolean')
  })
})

describe('supabase client', () => {
  it('either creates a client or sets null based on env', () => {
    // When configured, supabase is a SupabaseClient; otherwise null
    if (isSupabaseConfigured) {
      expect(supabase).not.toBeNull()
      expect(supabase?.supabaseUrl).toBeTruthy()
      expect(supabase?.supabaseKey).toBeTruthy()
    } else {
      expect(supabase).toBeNull()
    }
  })
})

describe('requireSupabase', () => {
  it('returns the client when configured, throws when not', () => {
    if (isSupabaseConfigured) {
      const client = requireSupabase()
      expect(client).toBe(supabase)
      expect(client.supabaseUrl).toBeTruthy()
    } else {
      expect(() => requireSupabase()).toThrow(
        'Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.',
      )
    }
  })
})
