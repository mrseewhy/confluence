import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

// Mock useNoteEditor to return a state with folder_id pre-set
// so handleSave can reach the banned user check.
vi.mock('@/hooks/useNoteEditor', () => ({
  useNoteEditor: () => {
    const state = {
      noteId: null,
      title: '',
      description: '',
      slug: '',
      folder_id: 'folder-1',        // ← pre-set so folder check passes
      visibility: 'public' as const,
      blocks: [],
    }
    return {
      state,
      saveStatus: 'idle' as const,
      saveError: null,
      isValid: true,
      contentVersion: 0,
      slugAvailable: true,
      slugChecking: false,
      setTitle: vi.fn(),
      setSlug: vi.fn(),
      setDescription: vi.fn(),
      setFolderId: vi.fn(),
      setVisibility: vi.fn(),
      addBlock: vi.fn(),
      updateBlock: vi.fn(),
      updateBlockMeta: vi.fn(),
      removeBlock: vi.fn(),
      moveBlock: vi.fn(),
      reorderBlock: vi.fn(),
      save: vi.fn().mockResolvedValue('test-slug'),
      checkSlugAvailability: vi.fn(),
      loadFromExisting: vi.fn(),
      resetEditor: vi.fn(),
      mergeRemoteBlocks: vi.fn(),
    }
  },
}))

// ── Supabase mock ─────────────────────────────────────────────

function createSupabaseMock() {
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
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-note', slug: 'test-note' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: true, error: null })),
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
    <button onClick={onClick} data-testid="create-button" {...props}>
      {children}
    </button>
  ),
}))

// ── Render helper ────────────────────────────────────────────

function renderCreateNote() {
  return import('./CreateNote').then(({ CreateNote }) =>
    render(
      <MemoryRouter initialEntries={['/dashboard/notes/new']}>
        <Routes>
          <Route path="/dashboard/notes/new" element={<CreateNote />} />
          <Route path="/dashboard/notes" element={<div>Notes list</div>} />
        </Routes>
      </MemoryRouter>,
    ),
  )
}

// ── Tests ────────────────────────────────────────────────────

describe('CreateNote — banned user guard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockIsBanned = false
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the editor for a non-banned user', async () => {
    mockIsBanned = false
    await renderCreateNote()

    const editor = await screen.findByTestId('note-editor', {}, { timeout: 4000 })
    expect(editor).toBeDefined()
  })

  it('blocks save when user is banned', async () => {
    mockIsBanned = true
    await renderCreateNote()

    // Wait for component to render
    const createButton = await screen.findByTestId('create-button', {}, { timeout: 4000 })
    expect(createButton).toBeDefined()

    // Click save — the ban check should log and return early
    createButton.click()

    // console.error should have been called with the banned message
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('banned'),
    )
    // Navigate should NOT be called — save was blocked
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
