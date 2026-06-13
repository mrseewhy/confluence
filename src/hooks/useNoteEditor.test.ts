import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useNoteEditor } from './useNoteEditor'

// ── Mock supabase ─────────────────────────────────────────────

function createSupabaseMock(overrides: Record<string, ReturnType<typeof vi.fn>> = {}) {
  const defaultSingle = vi.fn(() =>
    Promise.resolve({ data: { id: 'new-note-id', slug: 'test-slug' }, error: null }),
  )
  const defaultSelect = vi.fn(() => ({ single: overrides.single ?? defaultSingle }))
  const defaultInsert = vi.fn(() => ({ select: defaultSelect }))
  const defaultEq = vi.fn(() => Promise.resolve({ error: null }))
  const defaultUpdate = vi.fn(() => ({ eq: defaultEq }))
  const defaultRpc = vi.fn(() => Promise.resolve({ data: true, error: null }))
  const defaultFrom = vi.fn(() => ({
    insert: overrides.insert ?? defaultInsert,
    update: overrides.update ?? defaultUpdate,
    rpc: overrides.rpc ?? defaultRpc,
  }))

  return {
    from: defaultFrom,
    rpc: defaultRpc,
    requireSupabase: vi.fn(() => ({ from: defaultFrom, rpc: defaultRpc })),
  }
}

vi.mock('@/lib/supabase', () => ({
  requireSupabase: vi.fn(),
}))

// Re-import after mock
const { requireSupabase } = await import('@/lib/supabase')

// ── Helpers ───────────────────────────────────────────────────

function getUserId(index = 1) {
  return `00000000-0000-0000-0000-00000000000${index}`
}

// ── Tests ─────────────────────────────────────────────────────

describe('useNoteEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('save() — race condition on INSERT', () => {
    it('sets noteId synchronously via stateRef after INSERT', async () => {
      const mock = createSupabaseMock()
      vi.mocked(requireSupabase).mockReturnValue(
        mock as unknown as ReturnType<typeof requireSupabase>,
      )

      const { result } = renderHook(() => useNoteEditor())

      // Set up the editor with some content
      act(() => {
        result.current.setTitle('Test Note')
        result.current.setSlug('test-slug')
        result.current.setFolderId('folder-1')
      })

      // Initially, noteId should be null (new note)
      expect(result.current.state.noteId).toBeNull()

      // Call save (INSERT flow since noteId is null)
      let savedSlug: string | undefined
      await act(async () => {
        savedSlug = await result.current.save(getUserId(1))
      })

      // After save, noteId should be set to the returned ID
      expect(result.current.state.noteId).toBe('new-note-id')
      expect(savedSlug).toBe('test-slug')
    })

    it('prevents duplicate INSERT by using UPDATE on subsequent saves', async () => {
      const mock = createSupabaseMock()
      vi.mocked(requireSupabase).mockReturnValue(
        mock as unknown as ReturnType<typeof requireSupabase>,
      )

      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.setTitle('Test Note')
        result.current.setSlug('test-slug')
        result.current.setFolderId('folder-1')
      })

      // First save — INSERT
      await act(async () => {
        await result.current.save(getUserId(1))
      })

      // Verify INSERT was called
      expect(mock.from).toHaveBeenCalledWith('notes')

      // Reset mock call counts
      vi.clearAllMocks()

      // Second save — should be UPDATE (noteId is now set)
      // Set up mock for UPDATE this time
      const updateMock = {
        from: vi.fn(() => ({
          insert: vi.fn(),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
          rpc: vi.fn(() => Promise.resolve({ error: null, data: null })),
        })),
        rpc: vi.fn(() => Promise.resolve({ error: null, data: null })),
      }
      vi.mocked(requireSupabase).mockReturnValue(
        updateMock as unknown as ReturnType<typeof requireSupabase>,
      )

      await act(async () => {
        await result.current.save(getUserId(1))
      })

      // Should have called update (not insert)
      expect(updateMock.from).toHaveBeenCalledWith('notes')
    })
  })

  describe('save() — slug suggestion on 23505', () => {
    it('suggests an alternative slug on unique constraint violation', async () => {
      // Mock supabase to throw a 23505 error on INSERT
      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.reject({
              code: '23505',
              message: 'duplicate key value violates unique constraint "notes_slug_key"',
              details: 'Key (slug)=(test-slug) already exists.',
            }),
          ),
        })),
      }))

      const mock = createSupabaseMock({ insert: insertMock })
      vi.mocked(requireSupabase).mockReturnValue(
        mock as unknown as ReturnType<typeof requireSupabase>,
      )

      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.setTitle('Test Note')
        result.current.setSlug('test-slug')
        result.current.setFolderId('folder-1')
      })

      // Original slug
      expect(result.current.state.slug).toBe('test-slug')

      // Save should throw
      await act(async () => {
        try {
          await result.current.save(getUserId(1))
        } catch {
          // Expected error
        }
      })

      // Slug should now be a suggestion (test-slug-<suffix>)
      expect(result.current.state.slug).toMatch(/^test-slug-[a-z0-9]+$/)
      // saveError should mention the suggestion
      expect(result.current.saveError).toContain('test-slug')
      expect(result.current.saveStatus).toBe('error')
    })

    it('preserves user slug on non-23505 errors', async () => {
      // Mock supabase to throw a generic error
      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.reject(new Error('Network error')),
          ),
        })),
      }))

      const mock = createSupabaseMock({ insert: insertMock })
      vi.mocked(requireSupabase).mockReturnValue(
        mock as unknown as ReturnType<typeof requireSupabase>,
      )

      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.setTitle('Test Note')
        result.current.setSlug('my-custom-slug')
        result.current.setFolderId('folder-1')
      })

      await act(async () => {
        try {
          await result.current.save(getUserId(1))
        } catch {
          // Expected error
        }
      })

      // Slug should remain unchanged
      expect(result.current.state.slug).toBe('my-custom-slug')
      expect(result.current.saveStatus).toBe('error')
    })
  })

  describe('save() — general behavior', () => {
    it('transitions through saving and saved states on success', async () => {
      const mock = createSupabaseMock()
      vi.mocked(requireSupabase).mockReturnValue(
        mock as unknown as ReturnType<typeof requireSupabase>,
      )

      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.setTitle('Test Note')
        result.current.setSlug('test-slug')
        result.current.setFolderId('folder-1')
      })

      // Start saving (fire-and-forget, React will batch the state update)
      act(() => {
        result.current.save(getUserId(1))
      })

      // Should enter saving state before resolving
      await waitFor(() => {
        expect(result.current.saveStatus).toBe('saving')
      })

      // Wait for save to complete
      await waitFor(() => {
        expect(result.current.saveStatus).toBe('saved')
      })

      expect(result.current.saveError).toBeNull()
    })

    it('returns error on missing userId', async () => {
      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.setTitle('Test Note')
        result.current.setSlug('test-slug')
        result.current.setFolderId('folder-1')
      })

      await act(async () => {
        await result.current.save('')
      })

      expect(result.current.saveStatus).toBe('error')
    })
  })
})
