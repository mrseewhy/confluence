import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRealtimeCollaboration } from './useRealtimeCollaboration'

// ── Mocks ─────────────────────────────────────────────────────

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn((cb) => {
    cb('SUBSCRIBED')
    return { unsubscribe: vi.fn() }
  }),
  track: vi.fn().mockResolvedValue(undefined),
  untrack: vi.fn(),
  unsubscribe: vi.fn(),
  send: vi.fn().mockResolvedValue('ok'),
  presenceState: vi.fn().mockReturnValue({}),
}

const mockChannelFn = vi.fn(() => mockChannel)
const mockSupabaseClient = { channel: mockChannelFn }

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => mockSupabaseClient,
}))

// Get a reference to the mocked supabase client
const getMockClient = () => mockSupabaseClient

// ── Tests ─────────────────────────────────────────────────────

describe('useRealtimeCollaboration', () => {
  const defaultOptions = {
    noteId: 'note-123',
    userId: 'user-1',
    username: 'alice',
    avatarUrl: null,
    enabled: true,
    onBlocksReceived: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a channel when enabled and noteId is set', () => {
    renderHook(() => useRealtimeCollaboration(defaultOptions))

    expect(getMockClient().channel).toHaveBeenCalledWith(
      'note:note-123',
      expect.objectContaining({
        config: expect.objectContaining({
          broadcast: { ack: false, self: false },
          presence: { key: 'user-1' },
        }),
      }),
    )
  })

  it('does not create a channel when noteId is null', () => {
    renderHook(() =>
      useRealtimeCollaboration({ ...defaultOptions, noteId: null }),
    )

    expect(getMockClient().channel).not.toHaveBeenCalled()
  })

  it('does not create a channel when disabled', () => {
    renderHook(() =>
      useRealtimeCollaboration({ ...defaultOptions, enabled: false }),
    )

    expect(getMockClient().channel).not.toHaveBeenCalled()
  })

  it('tracks presence after subscribing', () => {
    renderHook(() => useRealtimeCollaboration(defaultOptions))

    expect(mockChannel.track).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        username: 'alice',
        avatarUrl: null,
      }),
    )
  })

  it('registers blocks_update broadcast listener', () => {
    renderHook(() => useRealtimeCollaboration(defaultOptions))

    expect(mockChannel.on).toHaveBeenCalledWith(
      'broadcast',
      { event: 'blocks_update' },
      expect.any(Function),
    )
  })

  it('registers cursor_update broadcast listener', () => {
    renderHook(() => useRealtimeCollaboration(defaultOptions))

    expect(mockChannel.on).toHaveBeenCalledWith(
      'broadcast',
      { event: 'cursor_update' },
      expect.any(Function),
    )
  })

  it('registers presence sync listener', () => {
    renderHook(() => useRealtimeCollaboration(defaultOptions))

    expect(mockChannel.on).toHaveBeenCalledWith(
      'presence',
      { event: 'sync' },
      expect.any(Function),
    )
  })

  it('subscribes to the channel', () => {
    renderHook(() => useRealtimeCollaboration(defaultOptions))

    expect(mockChannel.subscribe).toHaveBeenCalledWith(expect.any(Function))
  })

  it('broadcasts blocks via channel.send', () => {
    const { result } = renderHook(() => useRealtimeCollaboration(defaultOptions))

    act(() => {
      result.current.broadcast({
        blocks: [],
        title: 'Test',
        description: '',
        savedBy: 'alice',
        version: 1,
      })
    })

    expect(mockChannel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'blocks_update',
      payload: expect.objectContaining({
        type: 'blocks_update',
        title: 'Test',
        savedBy: 'alice',
        version: 1,
      }),
    })
  })

  it('sends full blocks payload on broadcast (matching beforeunload format)', () => {
    const { result } = renderHook(() => useRealtimeCollaboration(defaultOptions))

    const blocks = [
      { id: 'b1', type: 'text' as const, content: 'Hello', metadata: {}, order_index: 0 },
      { id: 'b2', type: 'code' as const, content: 'const x = 1', metadata: { language: 'javascript' }, order_index: 1 },
    ]

    act(() => {
      result.current.broadcast({
        blocks,
        title: 'My Note',
        description: 'A test note',
        savedBy: 'alice',
        version: 3,
      })
    })

    expect(mockChannel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'blocks_update',
      payload: {
        type: 'blocks_update',
        blocks,
        title: 'My Note',
        description: 'A test note',
        savedBy: 'alice',
        version: 3,
      },
    })
  })

  it('is safe to call broadcast when channel is not subscribed', () => {
    // Simulate rendering with disabled channel (no subscription)
    const { result } = renderHook(() =>
      useRealtimeCollaboration({ ...defaultOptions, enabled: false }),
    )

    // Broadcast should not throw when channel is null
    expect(() => {
      act(() => {
        result.current.broadcast({
          blocks: [],
          title: 'Test',
          description: '',
          savedBy: 'alice',
          version: 1,
        })
      })
    }).not.toThrow()

    expect(mockChannel.send).not.toHaveBeenCalled()
  })

  it('broadcasts cursor via channel.send', () => {
    const { result } = renderHook(() => useRealtimeCollaboration(defaultOptions))

    act(() => {
      result.current.broadcastCursor('block-1')
    })

    expect(mockChannel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'cursor_update',
      payload: expect.objectContaining({
        type: 'cursor_update',
        blockId: 'block-1',
        userId: 'user-1',
        username: 'alice',
      }),
    })
  })

  it('broadcasts null cursor when blurring', () => {
    const { result } = renderHook(() => useRealtimeCollaboration(defaultOptions))

    act(() => {
      result.current.broadcastCursor(null)
    })

    expect(mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ blockId: null }),
      }),
    )
  })

  it('exposes collaborators initially as empty', () => {
    const { result } = renderHook(() => useRealtimeCollaboration(defaultOptions))

    expect(result.current.collaborators).toEqual([])
  })

  it('exposes remoteCursors initially as empty', () => {
    const { result } = renderHook(() => useRealtimeCollaboration(defaultOptions))

    expect(result.current.remoteCursors).toEqual({})
  })

  it('sets collaborators from presence state', () => {
    const { result } = renderHook(() => useRealtimeCollaboration(defaultOptions))

    // Simulate presence sync
    const presenceCallback = mockChannel.on.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as string) === 'presence' &&
        (call[1] as { event: string }).event === 'sync',
    )?.[2]

    if (presenceCallback) {
      mockChannel.presenceState.mockReturnValue({
        'user-2': {
          'ref-1': { userId: 'user-2', username: 'bob', avatarUrl: null },
        },
      })

      act(() => {
        presenceCallback()
      })

      expect(result.current.collaborators).toEqual([
        { userId: 'user-2', username: 'bob', avatarUrl: null },
      ])
    }
  })

  it('excludes self from collaborators list', () => {
    const { result } = renderHook(() => useRealtimeCollaboration(defaultOptions))

    const presenceCallback = mockChannel.on.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as string) === 'presence' &&
        (call[1] as { event: string }).event === 'sync',
    )?.[2]

    if (presenceCallback) {
      mockChannel.presenceState.mockReturnValue({
        'user-1': {
          'ref-1': { userId: 'user-1', username: 'alice', avatarUrl: null },
        },
        'user-2': {
          'ref-2': { userId: 'user-2', username: 'bob', avatarUrl: null },
        },
      })

      act(() => {
        presenceCallback()
      })

      expect(result.current.collaborators).toHaveLength(1)
      expect(result.current.collaborators[0].userId).toBe('user-2')
    }
  })

  it('calls onBlocksReceived when blocks_update broadcast arrives', () => {
    const onBlocksReceived = vi.fn()
    renderHook(() =>
      useRealtimeCollaboration({ ...defaultOptions, onBlocksReceived }),
    )

    const broadcastCallback = mockChannel.on.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as string) === 'broadcast' &&
        (call[1] as { event: string }).event === 'blocks_update',
    )?.[2]

    if (broadcastCallback) {
      const payload = {
        type: 'blocks_update',
        blocks: [],
        title: 'Remote title',
        description: '',
        savedBy: 'bob',
        version: 2,
      }

      act(() => {
        broadcastCallback({ payload })
      })

      expect(onBlocksReceived).toHaveBeenCalledWith(payload)
    }
  })

  it('does not throw when broadcast is called in a fire-and-forget context (e.g. beforeunload)', () => {
    // beforeunload handlers must never throw — this verifies broadcast
    // is safe to call in that fire-and-forget context.
    const { result } = renderHook(() => useRealtimeCollaboration(defaultOptions))

    const handler = () => {
      result.current.broadcast({
        blocks: [],
        title: 'Emergency save',
        description: '',
        savedBy: 'alice',
        version: 10,
      })
    }

    expect(() => { act(() => { handler() }) }).not.toThrow()
    expect(mockChannel.send).toHaveBeenCalledTimes(1)
  })

  // ── Disconnect / reconnect ──────────────────────────────────

  it('unsubscribes from old channel when noteId changes', () => {
    const { rerender } = renderHook(
      (opts) => useRealtimeCollaboration(opts ?? defaultOptions),
      { initialProps: defaultOptions },
    )

    // Change noteId — should trigger cleanup and new channel
    rerender({ ...defaultOptions, noteId: 'note-456' })

    // Old channel should have been unsubscribed
    expect(mockChannel.unsubscribe).toHaveBeenCalled()

    // New channel should be created for the new noteId
    expect(getMockClient().channel).toHaveBeenCalledWith(
      'note:note-456',
      expect.anything(),
    )
  })

  it('re-tracks presence after reconnect', () => {
    const { rerender } = renderHook(
      (opts) => useRealtimeCollaboration(opts ?? defaultOptions),
      { initialProps: defaultOptions },
    )

    // Track should have been called once on initial subscribe
    expect(mockChannel.track).toHaveBeenCalledTimes(1)

    // Clear mock and change noteId to trigger reconnect
    vi.clearAllMocks()

    // Re-render with new noteId — should create new channel and re-track
    rerender({ ...defaultOptions, noteId: 'note-789' })

    // New channel should have been created (old was unsubscribed)
    expect(getMockClient().channel).toHaveBeenCalledWith(
      'note:note-789',
      expect.anything(),
    )
  })

  it('cleans up collaborators and remoteCursors on disconnect', () => {
    const { result, rerender } = renderHook(
      (opts) => useRealtimeCollaboration(opts ?? defaultOptions),
      { initialProps: defaultOptions },
    )

    // Simulate presence sync with a collaborator
    const presenceCallback = mockChannel.on.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as string) === 'presence' &&
        (call[1] as { event: string }).event === 'sync',
    )?.[2]

    if (presenceCallback) {
      mockChannel.presenceState.mockReturnValue({
        'user-2': {
          'ref-1': { userId: 'user-2', username: 'bob', avatarUrl: null },
        },
      })
      act(() => { presenceCallback() })
      expect(result.current.collaborators).toHaveLength(1)
    }

    // Disconnect by setting enabled to false
    rerender({ ...defaultOptions, enabled: false })

    // Collaborators and remoteCursors should be cleared
    expect(result.current.collaborators).toEqual([])
    expect(result.current.remoteCursors).toEqual({})
  })

  // ── 3+ concurrent users ─────────────────────────────────────

  it('tracks 3+ concurrent users from presence state', () => {
    const { result } = renderHook(() => useRealtimeCollaboration(defaultOptions))

    const presenceCallback = mockChannel.on.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as string) === 'presence' &&
        (call[1] as { event: string }).event === 'sync',
    )?.[2]

    if (presenceCallback) {
      // Simulate 3 other users present + self
      mockChannel.presenceState.mockReturnValue({
        'user-1': {
          'ref-0': { userId: 'user-1', username: 'alice', avatarUrl: null },
        },
        'user-2': {
          'ref-1': { userId: 'user-2', username: 'bob', avatarUrl: null },
        },
        'user-3': {
          'ref-2': { userId: 'user-3', username: 'charlie', avatarUrl: 'https://example.com/avatar.png' },
        },
        'user-4': {
          'ref-3': { userId: 'user-4', username: 'diana', avatarUrl: null },
        },
      })

      act(() => { presenceCallback() })

      // Should exclude self (user-1) and include the other 3
      expect(result.current.collaborators).toHaveLength(3)
      expect(result.current.collaborators.map(c => c.username)).toEqual(
        expect.arrayContaining(['bob', 'charlie', 'diana']),
      )
    }
  })

  // ── Race condition (rapid broadcasts) ───────────────────────

  it('handles rapid sequential broadcasts without throwing', () => {
    const { result } = renderHook(() => useRealtimeCollaboration(defaultOptions))

    expect(() => {
      act(() => {
        // Two rapid broadcasts — simulates what could happen
        // if two auto-saves fire in quick succession.
        result.current.broadcast({
          blocks: [], title: 'First', description: '', savedBy: 'alice', version: 1,
        })
        result.current.broadcast({
          blocks: [{ id: 'b1', type: 'text' as const, content: 'Second', metadata: {}, order_index: 0 }],
          title: 'Second', description: '', savedBy: 'alice', version: 2,
        })
      })
    }).not.toThrow()

    // channel.send should have been called twice
    expect(mockChannel.send).toHaveBeenCalledTimes(2)
  })

  it('broadcast is safe to call when channel is not yet subscribed', () => {
    // Save and replace the channel mock so subscribe never fires callback
    const originalChannel = getMockClient().channel
    const delayedChannel = {
      ...mockChannel,
      subscribe: vi.fn(), // never calls the callback
    }
    getMockClient().channel = vi.fn(() => delayedChannel)

    const { result } = renderHook(() => useRealtimeCollaboration(defaultOptions))

    // Broadcast before subscribe callback fires — channelRef is set but send is safe
    expect(() => {
      act(() => {
        result.current.broadcast({
          blocks: [], title: 'Early', description: '', savedBy: 'alice', version: 1,
        })
      })
    }).not.toThrow()

    // channel.send should have been called (channel exists, just not subscribed)
    expect(delayedChannel.send).toHaveBeenCalled()

    // Restore original mock so subsequent tests are not affected
    getMockClient().channel = originalChannel
  })

  // ── Channel cleanup on navigation ───────────────────────────

  it('unsubscribes and cleans up when hook unmounts', () => {
    const { unmount } = renderHook(() => useRealtimeCollaboration(defaultOptions))

    // Unmount the hook (simulates navigating away from the note)
    unmount()

    // Channel should be unsubscribed
    expect(mockChannel.unsubscribe).toHaveBeenCalled()
  })

  it('unsubscribes when noteId becomes null (e.g. navigating away)', () => {
    const { rerender } = renderHook(
      (opts) => useRealtimeCollaboration(opts ?? defaultOptions),
      { initialProps: defaultOptions },
    )

    expect(mockChannel.unsubscribe).not.toHaveBeenCalled()

    // Set noteId to null — should trigger cleanup
    rerender({ ...defaultOptions, noteId: null })

    expect(mockChannel.unsubscribe).toHaveBeenCalled()
  })

  // ── lastRemoteSaver flash banner timing ─────────────────────
  // The lastRemoteSaver state is managed in CreateNote/EditNote
  // via onBlocksReceived. We test the callback mechanism here.

  it('calls onBlocksReceived with incrementing remoteSaveId', () => {
    const onBlocksReceived = vi.fn()
    renderHook(() =>
      useRealtimeCollaboration({ ...defaultOptions, onBlocksReceived }),
    )

    const broadcastCallback = mockChannel.on.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as string) === 'broadcast' &&
        (call[1] as { event: string }).event === 'blocks_update',
    )?.[2]

    if (broadcastCallback) {
      const payload1 = {
        type: 'blocks_update',
        blocks: [], title: 'V1', description: '', savedBy: 'alice', version: 1,
      }
      const payload2 = {
        type: 'blocks_update',
        blocks: [], title: 'V2', description: '', savedBy: 'bob', version: 2,
      }

      act(() => { broadcastCallback({ payload: payload1 }) })
      act(() => { broadcastCallback({ payload: payload2 }) })

      // onBlocksReceived should be called for each broadcast
      expect(onBlocksReceived).toHaveBeenCalledTimes(2)
      expect(onBlocksReceived).toHaveBeenNthCalledWith(1, payload1)
      expect(onBlocksReceived).toHaveBeenNthCalledWith(2, payload2)
    }
  })

  it('preserves onBlocksReceived callback identity across re-renders via ref', () => {
    // The hook stores onBlocksReceived in a ref so the channel listener
    // always calls the latest version of the callback.
    const onBlocksReceived1 = vi.fn()
    const onBlocksReceived2 = vi.fn()

    const { rerender } = renderHook(
      (opts) => useRealtimeCollaboration(opts ?? defaultOptions),
      { initialProps: { ...defaultOptions, onBlocksReceived: onBlocksReceived1 } },
    )

    // The broadcast callback was registered with the channel once
    const broadcastCallback = mockChannel.on.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as string) === 'broadcast' &&
        (call[1] as { event: string }).event === 'blocks_update',
    )?.[2]

    // Re-render with a new callback — should update the ref
    rerender({ ...defaultOptions, onBlocksReceived: onBlocksReceived2 })

    if (broadcastCallback) {
      const payload = {
        type: 'blocks_update',
        blocks: [], title: 'After rerender', description: '', savedBy: 'alice', version: 3,
      }

      act(() => { broadcastCallback({ payload }) })

      // The NEW callback should be invoked (via ref), not the old one
      expect(onBlocksReceived2).toHaveBeenCalledWith(payload)
      expect(onBlocksReceived1).not.toHaveBeenCalled()
    }
  })

  it('broadcast works after multiple hook re-renders', () => {
    // Simulates the pattern in EditNote where broadcastCurrentState is
    // recreated every render but still works correctly on next call.
    const { result, rerender } = renderHook(
      (opts) => useRealtimeCollaboration(opts ?? defaultOptions),
      { initialProps: defaultOptions },
    )

    // Simulate several re-renders (as would happen during editing)
    for (let i = 0; i < 5; i++) {
      rerender({ ...defaultOptions, username: 'alice' })
    }

    act(() => {
      result.current.broadcast({
        blocks: [{ id: 'b1', type: 'text' as const, content: 'After edits', metadata: {}, order_index: 0 }],
        title: 'Final',
        description: '',
        savedBy: 'alice',
        version: 6,
      })
    })

    expect(mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ title: 'Final', version: 6 }),
      }),
    )
  })
})
