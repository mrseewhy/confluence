import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

/**
 * Guards the rule that leaving the editor is tied to a successful write.
 *
 * This exists because of a real bug: `save()` used to navigate away
 * unconditionally. Once save() began reporting conflicts and offline queues by
 * returning instead of throwing, the page started navigating away on failure
 * too — discarding the user's unsaved text and hiding the "someone else edited
 * this" warning they needed to see.
 */

const mockNavigate = vi.fn()
let saveResult: string | undefined = 'test-note'
let saveThrows = false

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...(actual as object), useNavigate: () => mockNavigate }
})

vi.mock('@/context/auth', () => ({
  useAuth: () => ({
    profile: {
      id: 'user-1',
      full_name: 'Active User',
      username: 'active-user',
      avatar_url: null,
      user_type: 'user' as const,
      subscription_tier: 'free' as const,
      is_banned: false,
      created_at: '2025-01-01T00:00:00Z',
    },
    user: { id: 'user-1' },
    status: 'authenticated' as const,
    dashboardPath: '/dashboard',
  }),
  fallbackProfile: (o: Record<string, unknown> = {}) => ({ id: '', is_banned: false, ...o }),
}))

vi.mock('@/hooks/useNoteEditor', () => ({
  useNoteEditor: () => ({
    state: {
      noteId: 'note-1',
      slug: 'test-note',
      title: 'T',
      description: '',
      folder_id: 'folder-1',
      visibility: 'private',
      blocks: [],
    },
    saveStatus: 'idle',
    saveError: null,
    loadFromExisting: vi.fn(() => Promise.resolve()),
    save: () => {
      if (saveThrows) return Promise.reject(new Error('boom'))
      return Promise.resolve(saveResult)
    },
  }),
}))

vi.mock('@/lib/supabase', () => {
  // Minimal stand-in: the page loads the note, sees the signed-in user as the
  // owner, and is then able to render the save button.
  const orderFn = vi.fn(() => Promise.resolve({ data: [], error: null }))
  const singleFn = vi.fn(() =>
    Promise.resolve({
      data: {
        id: 'note-1',
        title: 'Test Note',
        description: '',
        slug: 'test-note',
        folder_id: 'folder-1',
        visibility: 'private',
        owner_id: 'user-1',
      },
      error: null,
    }),
  )
  const selectFn = vi.fn(() => ({
    eq: vi.fn(() => ({ single: singleFn, order: orderFn })),
    order: orderFn,
  }))
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    track: vi.fn().mockResolvedValue(undefined),
    untrack: vi.fn(),
    unsubscribe: vi.fn(),
    send: vi.fn().mockResolvedValue('ok'),
    presenceState: vi.fn().mockReturnValue({}),
  }
  return {
    requireSupabase: vi.fn(() => ({ from: vi.fn(() => ({ select: selectFn })), channel: vi.fn(() => channel) })),
  }
})

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/editor/NoteEditor', () => ({
  NoteEditor: ({ headerActions }: { headerActions?: React.ReactNode }) => (
    <div data-testid="note-editor">{headerActions}</div>
  ),
  SaveIndicator: () => null,
}))

vi.mock('@/components/ui', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => (
    <button onClick={onClick} data-testid="save-button">
      {children}
    </button>
  ),
}))

async function renderEditNote() {
  const { EditNote } = await import('./EditNote')
  return render(
    <MemoryRouter initialEntries={['/dashboard/notes/test-note/edit']}>
      <Routes>
        <Route path="/dashboard/notes/:slug/edit" element={<EditNote />} />
        <Route path="/dashboard/notes" element={<div>Notes list</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EditNote — navigates only after a real save', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockNavigate.mockReset()
    saveThrows = false
    saveResult = 'test-note'
  })

  it('leaves the editor when save succeeds', async () => {
    await renderEditNote()
    ;(await screen.findByTestId('save-button')).click()
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard/notes'))
  })

  it('stays on the page when the save was queued offline', async () => {
    saveResult = undefined // offline queue: nothing written yet
    await renderEditNote()
    ;(await screen.findByTestId('save-button')).click()
    await new Promise((r) => setTimeout(r, 50))
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('stays on the page when the save hit a conflict', async () => {
    saveResult = undefined // conflict: user must see the warning
    await renderEditNote()
    ;(await screen.findByTestId('save-button')).click()
    await new Promise((r) => setTimeout(r, 50))
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('stays on the page when save throws', async () => {
    saveThrows = true
    await renderEditNote()
    ;(await screen.findByTestId('save-button')).click()
    await new Promise((r) => setTimeout(r, 50))
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
