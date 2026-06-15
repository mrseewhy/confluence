import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ═══════════════════════════════════════════════════════════════
// 1. Pure logic — folder reordering (sort_order swapping)
// ═══════════════════════════════════════════════════════════════

interface ReorderableItem {
  id: string
  sort_order: number
}

/**
 * Calculate sort_order swaps for moving an item up in a sorted list.
 * Returns the two items with their new sort_order values,
 * or null if the item cannot be moved up (already first).
 */
function calculateMoveUp<T extends ReorderableItem>(items: T[], id: string): [T, T] | null {
  const idx = items.findIndex((f) => f.id === id)
  if (idx <= 0) return null
  const current = items[idx]
  const above = items[idx - 1]
  return [
    { ...current, sort_order: above.sort_order },
    { ...above, sort_order: current.sort_order },
  ]
}

/**
 * Calculate sort_order swaps for moving an item down in a sorted list.
 * Returns the two items with their new sort_order values,
 * or null if the item cannot be moved down (already last).
 */
function calculateMoveDown<T extends ReorderableItem>(items: T[], id: string): [T, T] | null {
  const idx = items.findIndex((f) => f.id === id)
  if (idx < 0 || idx >= items.length - 1) return null
  const current = items[idx]
  const below = items[idx + 1]
  return [
    { ...current, sort_order: below.sort_order },
    { ...below, sort_order: current.sort_order },
  ]
}

/**
 * Reorder an array of items and assign sequential sort_order values
 * based on their new positions. Used by drag-to-reorder.
 * Returns the items with updated sort_order values.
 */
function applyDragReorder<T extends ReorderableItem>(
  items: T[],
  activeId: string,
  overId: string,
): T[] {
  if (activeId === overId) return items

  const oldIndex = items.findIndex((f) => f.id === activeId)
  const newIndex = items.findIndex((f) => f.id === overId)
  if (oldIndex === -1 || newIndex === -1) return items

  const reordered = [...items]
  const [moved] = reordered.splice(oldIndex, 1)
  reordered.splice(newIndex, 0, moved)

  // Reassign sequential sort_order values
  return reordered.map((item, i) => ({ ...item, sort_order: i }))
}

/**
 * Calculate the next sort_order value for a new item (max + 1).
 */
function calculateNextOrder<T extends ReorderableItem>(items: T[]): number {
  const maxSortOrder = items.reduce((max, item) => Math.max(max, item.sort_order), -1)
  return maxSortOrder + 1
}

describe('reordering — calculateMoveUp', () => {
  const items: ReorderableItem[] = [
    { id: 'a', sort_order: 0 },
    { id: 'b', sort_order: 1 },
    { id: 'c', sort_order: 2 },
  ]

  it('swaps sort_order when moving first item up is null (already first)', () => {
    expect(calculateMoveUp(items, 'a')).toBeNull()
  })

  it('swaps sort_order when moving middle item up', () => {
    const result = calculateMoveUp(items, 'b')
    expect(result).not.toBeNull()
    if (result) {
      const [current, above] = result
      expect(current.id).toBe('b')
      expect(current.sort_order).toBe(0) // takes above's order
      expect(above.id).toBe('a')
      expect(above.sort_order).toBe(1) // takes current's order
    }
  })

  it('swaps sort_order when moving last item up', () => {
    const result = calculateMoveUp(items, 'c')
    expect(result).not.toBeNull()
    if (result) {
      const [current, above] = result
      expect(current.id).toBe('c')
      expect(current.sort_order).toBe(1)
      expect(above.id).toBe('b')
      expect(above.sort_order).toBe(2)
    }
  })

  it('returns null for non-existent id', () => {
    expect(calculateMoveUp(items, 'z')).toBeNull()
  })
})

describe('reordering — calculateMoveDown', () => {
  const items: ReorderableItem[] = [
    { id: 'a', sort_order: 0 },
    { id: 'b', sort_order: 1 },
    { id: 'c', sort_order: 2 },
  ]

  it('swaps sort_order when moving first item down', () => {
    const result = calculateMoveDown(items, 'a')
    expect(result).not.toBeNull()
    if (result) {
      const [current, below] = result
      expect(current.id).toBe('a')
      expect(current.sort_order).toBe(1)
      expect(below.id).toBe('b')
      expect(below.sort_order).toBe(0)
    }
  })

  it('swaps sort_order when moving middle item down', () => {
    const result = calculateMoveDown(items, 'b')
    expect(result).not.toBeNull()
    if (result) {
      const [current, below] = result
      expect(current.id).toBe('b')
      expect(current.sort_order).toBe(2)
      expect(below.id).toBe('c')
      expect(below.sort_order).toBe(1)
    }
  })

  it('returns null when moving last item down (already last)', () => {
    expect(calculateMoveDown(items, 'c')).toBeNull()
  })

  it('returns null for non-existent id', () => {
    expect(calculateMoveDown(items, 'z')).toBeNull()
  })
})

describe('reordering — applyDragReorder', () => {
  const items: ReorderableItem[] = [
    { id: 'a', sort_order: 0 },
    { id: 'b', sort_order: 1 },
    { id: 'c', sort_order: 2 },
  ]

  it('does nothing when activeId === overId', () => {
    const result = applyDragReorder(items, 'b', 'b')
    expect(result).toEqual(items)
  })

  it('reorders when dragging item down', () => {
    const result = applyDragReorder(items, 'a', 'c')
    expect(result.map((i) => i.id)).toEqual(['b', 'c', 'a'])
    expect(result.map((i) => i.sort_order)).toEqual([0, 1, 2])
  })

  it('reorders when dragging item up', () => {
    const result = applyDragReorder(items, 'c', 'a')
    expect(result.map((i) => i.id)).toEqual(['c', 'a', 'b'])
    expect(result.map((i) => i.sort_order)).toEqual([0, 1, 2])
  })

  it('reorders when dragging to adjacent position', () => {
    const result = applyDragReorder(items, 'b', 'c')
    expect(result.map((i) => i.id)).toEqual(['a', 'c', 'b'])
    expect(result.map((i) => i.sort_order)).toEqual([0, 1, 2])
  })

  it('returns original array for non-existent active id', () => {
    const result = applyDragReorder(items, 'z', 'b')
    expect(result).toEqual(items)
  })

  it('returns original array for non-existent over id', () => {
    const result = applyDragReorder(items, 'a', 'z')
    expect(result).toEqual(items)
  })
})

describe('reordering — calculateNextOrder', () => {
  it('returns max sort_order + 1', () => {
    const items: ReorderableItem[] = [
      { id: 'a', sort_order: 0 },
      { id: 'b', sort_order: 5 },
      { id: 'c', sort_order: 2 },
    ]
    expect(calculateNextOrder(items)).toBe(6)
  })

  it('returns 0 for empty list', () => {
    expect(calculateNextOrder([])).toBe(0)
  })

  it('returns 1 for single item at order 0', () => {
    expect(calculateNextOrder([{ id: 'a', sort_order: 0 }])).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Pure logic — trash/soft-delete
// ═══════════════════════════════════════════════════════════════

/**
 * Format a timestamp for display.
 */
function formatTrashDate(isoString: string | null): string {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Check if a trashed note is eligible for permanent deletion (> 30 days old).
 */
function isEligibleForCleanup(deletedAt: string | null): boolean {
  if (!deletedAt) return false
  const deletedDate = new Date(deletedAt).getTime()
  const now = Date.now()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  return now - deletedDate >= thirtyDaysMs
}

describe('trash — formatTrashDate', () => {
  it('returns dash for null date', () => {
    expect(formatTrashDate(null)).toBe('—')
  })

  it('formats a valid ISO date string', () => {
    const result = formatTrashDate('2026-06-10T14:30:00Z')
    expect(result).toContain('Jun')
    expect(result).toContain('10')
    expect(result).toContain('2026')
  })
})

describe('trash — isEligibleForCleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false for null date', () => {
    expect(isEligibleForCleanup(null)).toBe(false)
  })

  it('returns false for recent deletion (1 day ago)', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    expect(isEligibleForCleanup(oneDayAgo)).toBe(false)
  })

  it('returns false for 29 days ago', () => {
    const twentyNineDays = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()
    expect(isEligibleForCleanup(twentyNineDays)).toBe(false)
  })

  it('returns true for 31 days ago', () => {
    const thirtyOneDays = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
    expect(isEligibleForCleanup(thirtyOneDays)).toBe(true)
  })

  it('returns true for 60 days ago', () => {
    const sixtyDays = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    expect(isEligibleForCleanup(sixtyDays)).toBe(true)
  })

  it('returns true for exactly 30 days ago (boundary)', () => {
    const exactly30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    expect(isEligibleForCleanup(exactly30)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. InviteCollaboratorInline — component tests
// ═══════════════════════════════════════════════════════════════

// Mock supabase
const mockInsert = vi.fn()
const mockFrom = vi.fn()
const mockRequireSupabase = vi.fn()

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => mockRequireSupabase(),
}))

// Mock UI components
vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, disabled, type }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    type?: 'submit' | 'button'
    [key: string]: unknown
  }) => (
    <button onClick={onClick} disabled={disabled} type={type} data-testid="invite-button">
      {children}
    </button>
  ),
  Input: ({ label, placeholder, value, onChange, error }: {
    label?: string
    placeholder?: string
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    error?: string
  }) => (
    <div>
      {label && <label>{label}</label>}
      <input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        data-testid="email-input"
      />
      {error && <span data-testid="error-msg" style={{ color: 'red' }}>{error}</span>}
    </div>
  ),
}))

describe('InviteCollaboratorInline', () => {
  const defaultProps = {
    noteId: 'note-1',
    noteTitle: 'Test Note',
    noteSlug: 'test-note',
    ownerUsername: 'testuser',
    ownerId: 'user-1',
    onInvited: vi.fn(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockRequireSupabase.mockReturnValue({
      from: mockFrom,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the invite form with email input and role selector', async () => {
    const { InviteCollaboratorInline } = await import('@/components/InviteCollaboratorInline')
    render(<InviteCollaboratorInline {...defaultProps} />)

    expect(screen.getByTestId('email-input')).toBeDefined()
    expect(screen.getByTestId('invite-button')).toBeDefined()
    expect(screen.getByText('Role')).toBeDefined()
  })

  it('shows validation error for invalid email', async () => {
    const { InviteCollaboratorInline } = await import('@/components/InviteCollaboratorInline')
    render(<InviteCollaboratorInline {...defaultProps} />)

    const input = screen.getByTestId('email-input')
    const button = screen.getByTestId('invite-button')

    await userEvent.type(input, 'not-an-email')
    await userEvent.click(button)

    expect(screen.getByText('Please enter a valid email address.')).toBeDefined()
    expect(defaultProps.onInvited).not.toHaveBeenCalled()
  })

  it('submits a valid invite and calls onInvited', async () => {
    const { InviteCollaboratorInline } = await import('@/components/InviteCollaboratorInline')
    const onInvited = vi.fn()
    render(<InviteCollaboratorInline {...defaultProps} onInvited={onInvited} />)

    const input = screen.getByTestId('email-input')
    const button = screen.getByTestId('invite-button')

    await userEvent.type(input, 'collab@example.com')
    await userEvent.click(button)

    // Should have called supabase.from('collaborators').insert(...)
    expect(mockFrom).toHaveBeenCalledWith('collaborators')
    expect(mockInsert).toHaveBeenCalled()
    expect(onInvited).toHaveBeenCalledWith({ email: 'collab@example.com', accessLevel: 'viewer' })
  })

  it('shows error message on supabase failure', async () => {
    mockInsert.mockRejectedValue(new Error('Database error'))
    const { InviteCollaboratorInline } = await import('@/components/InviteCollaboratorInline')
    render(<InviteCollaboratorInline {...defaultProps} />)

    const input = screen.getByTestId('email-input')
    const button = screen.getByTestId('invite-button')

    await userEvent.type(input, 'collab@example.com')
    await userEvent.click(button)

    expect(screen.getByText('Database error')).toBeDefined()
  })

  it('calls onInvited with selected role (editor)', async () => {
    const { InviteCollaboratorInline } = await import('@/components/InviteCollaboratorInline')
    const onInvited = vi.fn()
    render(<InviteCollaboratorInline {...defaultProps} onInvited={onInvited} />)

    const input = screen.getByTestId('email-input')
    const roleSelect = screen.getByRole('combobox')
    const button = screen.getByTestId('invite-button')

    await userEvent.type(input, 'editor@example.com')
    await userEvent.selectOptions(roleSelect, 'editor')
    await userEvent.click(button)

    expect(onInvited).toHaveBeenCalledWith({ email: 'editor@example.com', accessLevel: 'editor' })
  })

  it('disables the invite button while submitting', async () => {
    // Make the insert hang
    let resolveInsert!: () => void
    mockInsert.mockReturnValue(new Promise((resolve) => {
      resolveInsert = () => resolve({ error: null })
    }))

    const { InviteCollaboratorInline } = await import('@/components/InviteCollaboratorInline')
    const onInvited = vi.fn()
    render(<InviteCollaboratorInline {...defaultProps} onInvited={onInvited} />)

    const input = screen.getByTestId('email-input')
    const button = screen.getByTestId('invite-button')

    await userEvent.type(input, 'collab@example.com')
    await userEvent.click(button)

    // Button should be disabled while submitting
    expect(button).toBeDisabled()
    expect(button.textContent).toBe('Inviting…')

    // Resolve the insert
    await act(async () => { resolveInsert() })
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. Drag-to-reorder integration logic — batch update computation
// ═══════════════════════════════════════════════════════════════

/**
 * Compute the batch of sort_order updates needed after a drag.
 * Returns an array of { id, sort_order } to pass to update queries,
 * or null if no reorder is needed.
 */
function computeDragReorderUpdates<T extends ReorderableItem>(
  items: T[],
  activeId: string,
  overId: string,
): { id: string; sort_order: number }[] | null {
  const result = applyDragReorder(items, activeId, overId)
  if (result === items) return null
  return result.map((item) => ({ id: item.id, sort_order: item.sort_order }))
}

describe('computeDragReorderUpdates', () => {
  const items: ReorderableItem[] = [
    { id: 'a', sort_order: 0 },
    { id: 'b', sort_order: 1 },
    { id: 'c', sort_order: 2 },
  ]

  it('returns null when no reorder needed', () => {
    expect(computeDragReorderUpdates(items, 'a', 'a')).toBeNull()
  })

  it('returns updates when reorder needed', () => {
    const result = computeDragReorderUpdates(items, 'a', 'c')
    expect(result).toEqual([
      { id: 'b', sort_order: 0 },
      { id: 'c', sort_order: 1 },
      { id: 'a', sort_order: 2 },
    ])
  })
})


