import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('EnvCheck', () => {
  it('renders a red banner when VITE_SUPABASE_URL is missing', async () => {
    // Temporarily clear the env var
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')

    // Suppress the expected console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { EnvCheck } = await import('@/App')
    render(<EnvCheck />)

    expect(screen.getByText(/Configuration Error/i)).toBeTruthy()
    expect(
      screen.getByText(/VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set/i),
    ).toBeTruthy()

    consoleSpy.mockRestore()
  })

  it('renders a red banner when VITE_SUPABASE_ANON_KEY is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { EnvCheck } = await import('@/App')
    render(<EnvCheck />)

    expect(screen.getByText(/Configuration Error/i)).toBeTruthy()

    consoleSpy.mockRestore()
  })

  it('returns null when both env vars are set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { EnvCheck } = await import('@/App')
    const { container } = render(<EnvCheck />)

    expect(container.innerHTML).toBe('')

    consoleSpy.mockRestore()
  })
})
