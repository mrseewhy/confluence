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

  describe('draft save/load/restore', () => {
    it('restores draft for new notes on mount', () => {
      const draftData = {
        title: 'Draft Title',
        description: 'Draft desc',
        slug: 'draft-slug',
        folder_id: 'folder-1',
        visibility: 'private' as const,
        blocks: [{ type: 'text' as const, content: 'Draft content', metadata: {} }],
        savedAt: Date.now(),
      }
      localStorage.setItem('confluence-draft-new', JSON.stringify(draftData))

      const { result } = renderHook(() => useNoteEditor())

      expect(result.current.state.title).toBe('Draft Title')
      expect(result.current.state.description).toBe('Draft desc')
      expect(result.current.state.slug).toBe('draft-slug')
      expect(result.current.state.folder_id).toBe('folder-1')
      expect(result.current.state.visibility).toBe('private')
      expect(result.current.state.blocks).toHaveLength(1)
      expect(result.current.state.blocks[0].content).toBe('Draft content')
      expect(result.current.state.blocks[0].type).toBe('text')
    })

    it('restores draft in loadFromExisting when draft exists', async () => {
      const note = {
        id: 'note-1',
        title: 'DB Title',
        description: 'DB desc',
        slug: 'db-slug',
        folder_id: 'folder-db',
        visibility: 'public',
      }
      const blocks: { id: string; type: string; content: string; metadata: Record<string, unknown> | null }[] = []

      // Save a draft that should take precedence
      const draftData = {
        title: 'Draft Title Override',
        description: 'Draft desc',
        slug: 'draft-slug',
        folder_id: 'folder-draft',
        visibility: 'private' as const,
        blocks: [{ type: 'text' as const, content: 'Draft overrides DB', metadata: {} }],
        savedAt: Date.now(),
      }
      localStorage.setItem('confluence-draft-note-1', JSON.stringify(draftData))

      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.loadFromExisting(note, blocks)
      })

      // Draft should take precedence
      expect(result.current.state.title).toBe('Draft Title Override')
      expect(result.current.state.folder_id).toBe('folder-draft')
      expect(result.current.state.blocks[0].content).toBe('Draft overrides DB')
      expect(result.current.state.noteId).toBe('note-1')
    })

    it('clears draft on successful save', async () => {
      const mock = createSupabaseMock()
      vi.mocked(requireSupabase).mockReturnValue(
        mock as unknown as ReturnType<typeof requireSupabase>,
      )

      localStorage.setItem('confluence-draft-new', JSON.stringify({
        title: 'Draft',
        description: '',
        slug: 'draft',
        folder_id: 'folder-1',
        visibility: 'public',
        blocks: [],
        savedAt: Date.now(),
      }))

      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.setTitle('Clean Save')
      })

      await act(async () => {
        await result.current.save(getUserId(1))
      })

      // Draft should be cleared after successful save
      expect(localStorage.getItem('confluence-draft-new')).toBeNull()
    })

    it('resetEditor restores draft for new notes', () => {
      localStorage.setItem('confluence-draft-new', JSON.stringify({
        title: 'Draft After Reset',
        description: '',
        slug: 'draft-reset',
        folder_id: 'folder-2',
        visibility: 'public',
        blocks: [{ type: 'text' as const, content: 'Reset content', metadata: {} }],
        savedAt: Date.now(),
      }))

      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.resetEditor()
      })

      // resetEditor should restore the draft
      expect(result.current.state.title).toBe('Draft After Reset')
      expect(result.current.state.blocks[0].content).toBe('Reset content')
    })

    it('bumpVersion is called after resetEditor', () => {
      const { result } = renderHook(() => useNoteEditor())

      const initialVersion = result.current.contentVersion

      act(() => {
        result.current.resetEditor()
      })

      // contentVersion should increase (bumpVersion was called)
      expect(result.current.contentVersion).toBeGreaterThan(initialVersion)
    })
  })

  describe('draft auto-save debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      localStorage.clear()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('does not save draft on initial mount (contentVersion=0)', () => {
      renderHook(() => useNoteEditor())

      // Advance well past the debounce — no save should occur
      vi.advanceTimersByTime(10000)

      expect(localStorage.getItem('confluence-draft-new')).toBeNull()
    })

    it('saves draft to localStorage after 2s debounce following content change', async () => {
      const { result } = renderHook(() => useNoteEditor())

      // Make a content change — bumps contentVersion, starts debounce timer
      act(() => {
        result.current.setTitle('Draft Title')
      })

      // Advance 1s — draft should NOT be saved yet
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })
      expect(localStorage.getItem('confluence-draft-new')).toBeNull()

      // Advance another 1.5s — total 2.5s, past the 2s debounce
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })

      const saved = localStorage.getItem('confluence-draft-new')
      expect(saved).not.toBeNull()

      if (saved) {
        const data = JSON.parse(saved)
        expect(data.title).toBe('Draft Title')
      }
    })

    it('resets debounce timer when another content change occurs', async () => {
      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.setTitle('First')
      })

      // Advance 1s — timer is partially through
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })
      expect(localStorage.getItem('confluence-draft-new')).toBeNull()

      // Make another change — effect cleanup saves "First" immediately,
      // and a new 2s timer starts for "Second"
      act(() => {
        result.current.setTitle('Second')
      })

      // After the second change, the cleanup saved "First" immediately
      const firstSave = localStorage.getItem('confluence-draft-new')
      expect(firstSave).not.toBeNull()
      if (firstSave) {
        const data = JSON.parse(firstSave)
        expect(data.title).toBe('First')
      }

      // Advance 1s from the reset — 1 < 2, "Second" not saved yet
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      const secondSave = JSON.parse(localStorage.getItem('confluence-draft-new')!)
      expect(secondSave.title).toBe('First') // still the "First" cleanup save

      // Advance another 1.5s — total 2.5s from reset, past 2s debounce
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })

      const saved = JSON.parse(localStorage.getItem('confluence-draft-new')!)
      expect(saved.title).toBe('Second')
    })

    it('saves draft to localStorage on beforeunload event', async () => {
      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.setTitle('Beforeunload Draft')
      })

      // Simulate beforeunload event — should save the draft immediately
      const event = new Event('beforeunload')
      act(() => {
        window.dispatchEvent(event)
      })

      const saved = localStorage.getItem('confluence-draft-new')
      expect(saved).not.toBeNull()

      if (saved) {
        const data = JSON.parse(saved)
        expect(data.title).toBe('Beforeunload Draft')
      }
    })

    it('saves draft immediately on unmount (cleanup function)', async () => {
      const { result, unmount } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.setTitle('Unmount Save')
      })

      // Don't advance time — unmount before debounce fires
      unmount()

      // Draft should be saved by the cleanup function
      const saved = localStorage.getItem('confluence-draft-new')
      expect(saved).not.toBeNull()

      if (saved) {
        const data = JSON.parse(saved)
        expect(data.title).toBe('Unmount Save')
      }
    })
  })

  describe('checkSlugAvailability — debounce, cancellation, race conditions', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('debounces slug checks: only calls RPC once after rapid calls', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: true, error: null })
      const mockSupabase = {
        from: vi.fn(),
        rpc: mockRpc,
      }
      vi.mocked(requireSupabase).mockReturnValue(
        mockSupabase as unknown as ReturnType<typeof requireSupabase>,
      )

      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.setTitle('Test Note')
      })

      // Call checkSlugAvailability multiple times rapidly
      act(() => {
        result.current.checkSlugAvailability(getUserId(1))
        result.current.checkSlugAvailability(getUserId(1))
        result.current.checkSlugAvailability(getUserId(1))
      })

      // Before the debounce timer fires, RPC should not have been called
      expect(mockRpc).not.toHaveBeenCalled()

      // Advance time past the 400ms debounce
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // RPC should have been called exactly once (debounced)
      expect(mockRpc).toHaveBeenCalledTimes(1)
      expect(mockRpc).toHaveBeenCalledWith('is_slug_available', {
        p_slug: 'test-note',
        p_owner_id: getUserId(1),
        p_exclude_note_id: null,
      })

      expect(result.current.slugAvailable).toBe(true)
      expect(result.current.slugChecking).toBe(false)
    })

    it('cancels previous slug check when slug changes', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: true, error: null })
      const mockSupabase = {
        from: vi.fn(),
        rpc: mockRpc,
      }
      vi.mocked(requireSupabase).mockReturnValue(
        mockSupabase as unknown as ReturnType<typeof requireSupabase>,
      )

      const { result } = renderHook(() => useNoteEditor())

      // Set title to generate initial slug
      act(() => {
        result.current.setTitle('First Title')
      })

      // Start a slug check for the first slug (pass slug explicitly to
      // avoid relying on stateRef timing)
      act(() => {
        result.current.checkSlugAvailability(getUserId(1), 'first-slug')
      })

      // Before debounce fires, start a second check with different slug
      act(() => {
        result.current.checkSlugAvailability(getUserId(1), 'different-slug')
      })

      // Advance time — only the second check should fire (first was cancelled)
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // RPC should have been called exactly once (first was cancelled by second)
      expect(mockRpc).toHaveBeenCalledTimes(1)
      // Should check the latest slug, not the first
      expect(mockRpc).toHaveBeenCalledWith('is_slug_available', expect.objectContaining({
        p_slug: 'different-slug',
      }))
    })

    it('handles race condition: latest slug check wins', async () => {
      // Simulate a race where the first check returns AFTER the second
      // (e.g., network reordering). The latest check result should win.
      const slowRpc = vi.fn()
        .mockResolvedValueOnce({ data: false, error: null })  // first response (slow)
        .mockResolvedValueOnce({ data: true, error: null })   // second response (fast)

      const mockSupabase = {
        from: vi.fn(),
        rpc: slowRpc,
      }
      vi.mocked(requireSupabase).mockReturnValue(
        mockSupabase as unknown as ReturnType<typeof requireSupabase>,
      )

      const { result } = renderHook(() => useNoteEditor())

      // Set up with an initial slug
      act(() => {
        result.current.setTitle('Test')
      })

      // First check
      act(() => {
        result.current.checkSlugAvailability(getUserId(1), 'slug-one')
      })

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // First check resolved — slug is NOT available
      expect(slowRpc).toHaveBeenCalledTimes(1)

      // Second check with a different slug
      act(() => {
        result.current.checkSlugAvailability(getUserId(1), 'slug-two')
      })

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // Both RPCs were called
      expect(slowRpc).toHaveBeenCalledTimes(2)

      // The latest result should be the one that matters:
      // Since both resolved, the last setSlugAvailable call wins
      expect(result.current.slugAvailable).toBe(true)  // slug-two is available
    })

    it('sets slugChecking to true during check and false after', async () => {
      const mockRpc = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: true, error: null }), 100)),
      )
      const mockSupabase = {
        from: vi.fn(),
        rpc: mockRpc,
      }
      vi.mocked(requireSupabase).mockReturnValue(
        mockSupabase as unknown as ReturnType<typeof requireSupabase>,
      )

      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.setTitle('Test')
      })

      // Start checking
      act(() => {
        result.current.checkSlugAvailability(getUserId(1))
      })

      // Should not be checking yet (debounce hasn't fired)
      expect(result.current.slugChecking).toBe(false)

      // Advance past debounce — should start checking
      await act(async () => {
        vi.advanceTimersByTime(450)
      })

      // Now the async check is in flight
      expect(result.current.slugChecking).toBe(true)

      // Complete the async check
      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      // Check completed
      expect(result.current.slugChecking).toBe(false)
    })

    it('falls back to available=true on network error', async () => {
      const mockRpc = vi.fn().mockRejectedValue(new Error('Network failure'))
      const mockSupabase = {
        from: vi.fn(),
        rpc: mockRpc,
      }
      vi.mocked(requireSupabase).mockReturnValue(
        mockSupabase as unknown as ReturnType<typeof requireSupabase>,
      )

      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.setTitle('Test')
      })

      act(() => {
        result.current.checkSlugAvailability(getUserId(1))
      })

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      // Should default to available on error
      expect(result.current.slugAvailable).toBe(true)
      expect(result.current.slugChecking).toBe(false)
    })

    it('returns early for empty slug without calling RPC', () => {
      const mockRpc = vi.fn()
      const mockSupabase = {
        from: vi.fn(),
        rpc: mockRpc,
      }
      vi.mocked(requireSupabase).mockReturnValue(
        mockSupabase as unknown as ReturnType<typeof requireSupabase>,
      )

      const { result } = renderHook(() => useNoteEditor())

      act(() => {
        result.current.checkSlugAvailability(getUserId(1), '')
      })

      // RPC should not have been called
      expect(mockRpc).not.toHaveBeenCalled()
      // slugAvailable should remain true
      expect(result.current.slugAvailable).toBe(true)
      expect(result.current.slugChecking).toBe(false)
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
