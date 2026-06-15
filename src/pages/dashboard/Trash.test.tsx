import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// ── Mocks ────────────────────────────────────────────────────

const mockFrom = vi.fn()
const mockRpc = vi.fn()

const mockRequireSupabase = vi.fn(() => ({
  from: mockFrom,
  rpc: mockRpc,
}))

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => mockRequireSupabase(),
}))

vi.mock('@/context/auth', () => ({
  useAuth: () => ({
    profile: {
      id: 'user-1',
      username: 'testuser',
      full_name: 'Test User',
      is_banned: false,
    },
  }),
  fallbackProfile: () => ({
    id: 'fallback',
    username: 'guest',
    full_name: 'Guest',
    is_banned: false,
  }),
}))

vi.mock('@/components/Toast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}))

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/layout/DashboardIcon', () => ({
  Icon: () => null,
  IC: { notes: '', folder: '', plus: '', subfolder: '' },
}))

vi.mock('@/components/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children, onClick, ..._props }: {
    children: React.ReactNode
    onClick?: () => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }) => (
    <button onClick={onClick}>{children}</button>
  ),
  EmptyState: ({ icon, title, description }: {
    icon?: string
    title?: string
    description?: string
  }) => <div data-testid="empty-state"><span>{icon}</span><h2>{title}</h2><p>{description}</p></div>,
}))

vi.mock('@/components/Modal', () => ({
  Modal: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="modal">{children}</div> : null,
}))

vi.mock('@/components/PaginationBar', () => ({
  PaginationBar: () => null,
}))

// ── Test helpers ─────────────────────────────────────────────

interface NoteData {
  id: string
  title: string
  deleted_at: string | null
  folder?: { id: string; title: string; slug: string }
  description?: string | null
}

function setupTrashData(notes: NoteData[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'notes') {
      return {
        select: vi.fn((_columns: string, opts?: { count?: 'exact'; head?: boolean }) => {
          if (opts?.count === 'exact') {
            // Count query chain: .eq(...).not(...)
            return {
              eq: vi.fn(() => ({
                not: vi.fn(() => Promise.resolve({ count: notes.length, data: null, error: null })),
              })),
            }
          }
          // Data query chain: .eq(...).not(...).order(...).range(...)
          return {
            eq: vi.fn(() => ({
              not: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn(() => Promise.resolve({ data: notes, error: null })),
                })),
              })),
            })),
          }
        }),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      }
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  setupTrashData([])
})

// ── Tests ────────────────────────────────────────────────────

describe('DashboardTrash', () => {
  it('renders empty state when no trashed notes', async () => {
    const { DashboardTrash } = await import('./Trash')
    render(<DashboardTrash />)

    const emptyState = await screen.findByTestId('empty-state', {}, { timeout: 3000 })
    expect(emptyState).toBeDefined()
    expect(screen.getByText('Trash is empty')).toBeDefined()
  })

  it('renders trashed notes when data is available', async () => {
    setupTrashData([
      { id: 'note-1', title: 'Trashed Note', deleted_at: '2026-06-10T12:00:00Z' },
    ])

    const { DashboardTrash } = await import('./Trash')
    render(<DashboardTrash />)

    const noteTitle = await screen.findByText('Trashed Note', {}, { timeout: 3000 })
    expect(noteTitle).toBeDefined()
    expect(screen.getByText('Restore')).toBeDefined()
    expect(screen.getByText('Delete forever')).toBeDefined()
  })

  it('has restore and delete buttons for each trashed note', async () => {
    setupTrashData([
      { id: 'note-1', title: 'Note A', deleted_at: '2026-06-10T12:00:00Z' },
    ])

    const { DashboardTrash } = await import('./Trash')
    render(<DashboardTrash />)

    await waitFor(() => expect(screen.getByText('Note A')).toBeDefined())
    expect(screen.getByText('Restore')).toBeDefined()
    expect(screen.getByText('Delete forever')).toBeDefined()
  })

  it('renders the cleanup button when trashed notes exist', async () => {
    setupTrashData([
      { id: 'note-1', title: 'Note A', deleted_at: '2026-06-10T12:00:00Z' },
    ])

    const { DashboardTrash } = await import('./Trash')
    render(<DashboardTrash />)

    const cleanupBtn = await screen.findByText('Clean up old items', {}, { timeout: 3000 })
    expect(cleanupBtn).toBeDefined()
  })
})
