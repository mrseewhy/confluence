import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ── Mocks ─────────────────────────────────────────────────────
const mockAuth = {
  user: { id: 'u1', email: 'me@test.com' } as { id: string; email: string } | null,
  profile: { id: 'u1', user_type: 'user' } as { id: string; user_type: string } | null,
}
vi.mock('@/context/auth', () => ({ useAuth: () => mockAuth }))

const mockAddToast = vi.fn()
vi.mock('@/components/Toast', () => ({ useToast: () => ({ addToast: mockAddToast }) }))

// In-memory fake for the two supabase queries the panel makes.
let commentsRows: Record<string, unknown>[] = []
let profileRows: Record<string, unknown>[] = []
const insertSingle = vi.fn()

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'note_comments') {
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: commentsRows, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: insertSingle,
          }),
        }),
        delete: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }
    }
    // public_profiles
    return {
      select: () => ({
        in: () => Promise.resolve({ data: profileRows, error: null }),
      }),
    }
  }
  return { requireSupabase: () => ({ from }) }
})

import { CommentsPanel } from './CommentsPanel'

beforeEach(() => {
  commentsRows = []
  profileRows = []
  insertSingle.mockReset()
  mockAddToast.mockReset()
  mockAuth.user = { id: 'u1', email: 'me@test.com' }
  mockAuth.profile = { id: 'u1', user_type: 'user' }
})

describe('CommentsPanel', () => {
  it('shows an empty state when there are no comments', async () => {
    render(<CommentsPanel noteId="n1" noteOwnerId="owner" />)
    await waitFor(() => expect(screen.getByText('No comments yet.')).toBeInTheDocument())
  })

  it('renders comments with author names and reply nesting', async () => {
    commentsRows = [
      { id: 'c1', note_id: 'n1', author_id: 'u2', parent_id: null, body: 'top level', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      { id: 'c2', note_id: 'n1', author_id: 'u2', parent_id: 'c1', body: 'a reply', created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
    ]
    profileRows = [{ id: 'u2', full_name: 'Sarah Lee', username: 'sarah', avatar_url: null }]
    render(<CommentsPanel noteId="n1" noteOwnerId="owner" />)
    await waitFor(() => expect(screen.getByText('top level')).toBeInTheDocument())
    expect(screen.getByText('a reply')).toBeInTheDocument()
    expect(screen.getAllByText('Sarah Lee').length).toBeGreaterThan(0)
    expect(screen.getByText(/Comments/)).toHaveTextContent('(2)')
  })

  it('posts a new comment and appends it', async () => {
    insertSingle.mockResolvedValue({
      data: { id: 'c9', note_id: 'n1', author_id: 'u1', parent_id: null, body: 'hello', created_at: '2026-01-03T00:00:00Z', updated_at: '2026-01-03T00:00:00Z' },
      error: null,
    })
    render(<CommentsPanel noteId="n1" noteOwnerId="owner" />)
    await waitFor(() => expect(screen.getByText('No comments yet.')).toBeInTheDocument())

    const box = screen.getByLabelText('Add a comment')
    fireEvent.change(box, { target: { value: 'hello' } })
    fireEvent.click(screen.getByText('Post comment'))

    await waitFor(() => expect(screen.getByText('hello')).toBeInTheDocument())
    expect(insertSingle).toHaveBeenCalled()
    expect(mockAddToast).toHaveBeenCalledWith('Comment posted', 'success')
  })

  it('prompts anonymous visitors to sign in and hides the composer', async () => {
    mockAuth.user = null
    mockAuth.profile = null
    render(<CommentsPanel noteId="n1" noteOwnerId="owner" />)
    await waitFor(() => expect(screen.getByText('Sign in to join the discussion.')).toBeInTheDocument())
    expect(screen.queryByLabelText('Add a comment')).not.toBeInTheDocument()
  })

  it('lets the note owner delete any comment', async () => {
    mockAuth.user = { id: 'owner', email: 'o@test.com' }
    commentsRows = [
      { id: 'c1', note_id: 'n1', author_id: 'u2', parent_id: null, body: 'someone else', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    ]
    profileRows = [{ id: 'u2', full_name: 'Sarah Lee', username: 'sarah', avatar_url: null }]
    render(<CommentsPanel noteId="n1" noteOwnerId="owner" />)
    await waitFor(() => expect(screen.getByText('someone else')).toBeInTheDocument())
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })
})
