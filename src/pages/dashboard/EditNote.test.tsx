import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ── Controllable mock state ──────────────────────────────────

let mockIsBanned = false

// ── Module-level mocks (hoisted by vitest before imports) ────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: 'test-note' }),
  }
})

vi.mock('@/context/auth', () => ({
  useAuth: () => ({
    profile: {
      id: 'user-1',
      full_name: mockIsBanned ? 'Banned User' : 'Active User',
      username: mockIsBanned ? 'banned-user' : 'active-user',
      avatar_url: null,
      user_type: 'user' as const,
      subscription_tier: 'free' as const,
      is_banned: mockIsBanned,
      created_at: '2025-01-01T00:00:00Z',
    },
    user: { id: 'user-1' },
    status: 'authenticated' as const,
    dashboardPath: '/dashboard',
  }),
  fallbackProfile: (overrides?: Record<string, unknown>) => ({
    id: '',
    full_name: 'Loading...',
    username: '',
    avatar_url: null,
    user_type: 'user',
    subscription_tier: 'free',
    is_banned: false,
    created_at: '',
    ...overrides,
  }),
}))

// Build a chained supabase mock that returns note data
function createSupabaseMock() {
  const orderFn = vi.fn(() => Promise.resolve({ data: [], error: null }))
  const singleFn = vi.fn(() =>
    Promise.resolve({
      data: {
        id: 'note-1',
        title: 'Test Note',
        description: '',
        slug: 'test-note',
        folder_id: 'folder-1',
        visibility: 'public',
        owner_id: 'user-1',
      },
      error: null,
    }),
  )
  const selectFn = vi.fn(() => ({
    eq: vi.fn(() => ({
      single: singleFn,
      order: orderFn,
    })),
    order: orderFn,
  }))
  const fromFn = vi.fn(() => ({
    select: selectFn,
  }))
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((cb: (s: string) => void) => { cb('SUBSCRIBED'); return { unsubscribe: vi.fn() } }),
    track: vi.fn().mockResolvedValue(undefined),
    untrack: vi.fn(),
    unsubscribe: vi.fn(),
    send: vi.fn().mockResolvedValue('ok'),
    presenceState: vi.fn().mockReturnValue({}),
  }
  return {
    from: fromFn,
    channel: vi.fn(() => mockChannel),
  }
}

vi.mock('@/lib/supabase', () => ({
  requireSupabase: vi.fn(() => createSupabaseMock()),
}))

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}))

vi.mock('@/components/editor/NoteEditor', () => ({
  NoteEditor: ({ headerActions }: { headerActions?: React.ReactNode }) => (
    <div data-testid="note-editor">
      Note Editor
      {headerActions}
    </div>
  ),
  SaveIndicator: () => null,
}))

vi.mock('@/components/ui', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode
    onClick?: () => void
    [key: string]: unknown
  }) => (
    <button onClick={onClick} data-testid="save-button" {...props}>
      {children}
    </button>
  ),
}))

// ── Render helper ────────────────────────────────────────────

function renderEditNote() {
  // Dynamic import so mocks are in place first
  return import('./EditNote').then(({ EditNote }) =>
    render(
      <MemoryRouter initialEntries={['/dashboard/notes/test-note/edit']}>
        <Routes>
          <Route path="/dashboard/notes/:slug/edit" element={<EditNote />} />
          <Route path="/dashboard/notes" element={<div>Notes list</div>} />
        </Routes>
      </MemoryRouter>,
    ),
  )
}

// ── Tests ────────────────────────────────────────────────────

describe('EditNote — banned user guard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockIsBanned = false
  })

  it('renders the editor for a non-banned user', async () => {
    mockIsBanned = false
    await renderEditNote()

    const editor = await screen.findByTestId('note-editor', {}, { timeout: 4000 })
    expect(editor).toBeDefined()
  })

  it('blocks save when user is banned', async () => {
    mockIsBanned = true
    await renderEditNote()

    // Wait for component to finish loading (it still loads note data for banned users)
    const saveButton = await screen.findByTestId('save-button', {}, { timeout: 4000 })
    expect(saveButton).toBeDefined()

    // Click save — the ban check should prevent navigation
    saveButton.click()

    // console.error should have been called with the banned message
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('banned'),
    )
    // Navigate should NOT be called — save was blocked
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
