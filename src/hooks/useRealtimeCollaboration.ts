import { useEffect, useRef, useState, useCallback } from 'react'
import { requireSupabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { BlockType, BlockMetadata } from '@/types'

// ── Types ─────────────────────────────────────────────────────

export interface Collaborator {
  userId: string
  username: string
  avatarUrl: string | null
}

/** Payload sent on every save to notify other clients. */
export interface BlocksUpdatePayload {
  type: 'blocks_update'
  blocks: Array<{
    id: string
    type: BlockType
    content: string
    metadata: BlockMetadata
    order_index: number
  }>
  title: string
  description: string
  savedBy: string  // username of who saved
  version: number
}

/** Payload sent when the user focuses a different block. */
export interface CursorUpdatePayload {
  type: 'cursor_update'
  blockId: string | null
  userId: string
  username: string
}

/** Per-user cursor state tracked locally. */
export interface RemoteCursor {
  userId: string
  blockId: string | null
  username: string
}

export interface UseRealtimeCollaborationOptions {
  noteId: string | null
  userId: string
  username: string
  avatarUrl: string | null
  enabled: boolean
  /** Called when blocks are received from a remote collaborator */
  onBlocksReceived: (payload: BlocksUpdatePayload) => void
  /** Called when a remote collaborator focuses a different block */
  onCursorUpdate?: (payload: CursorUpdatePayload) => void
}

interface UseRealtimeCollaborationReturn {
  collaborators: Collaborator[]
  /** Broadcast the current editor state to other clients */
  broadcast: (payload: Omit<BlocksUpdatePayload, 'type'>) => void
  /** Broadcast cursor focus change */
  broadcastCursor: (blockId: string | null) => void
  /** Currently known remote cursors keyed by userId */
  remoteCursors: Record<string, RemoteCursor>
}

// ── Color palette for presence avatars ────────────────────────

const PRESENCE_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#f43f5e',
  '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
  '#f97316', '#3b82f6', '#84cc16', '#a855f7',
]

function hashUserId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function avatarColor(userId: string): string {
  return PRESENCE_COLORS[hashUserId(userId) % PRESENCE_COLORS.length]
}

// ── Hook ──────────────────────────────────────────────────────

export function useRealtimeCollaboration({
  noteId,
  userId,
  username,
  avatarUrl,
  enabled,
  onBlocksReceived,
  onCursorUpdate,
}: UseRealtimeCollaborationOptions): UseRealtimeCollaborationReturn {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({})
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Keep the callback refs so the channel listener always calls the latest version
  const onBlocksReceivedRef = useRef(onBlocksReceived)
  useEffect(() => {
    onBlocksReceivedRef.current = onBlocksReceived
  }, [onBlocksReceived])

  const onCursorUpdateRef = useRef(onCursorUpdate)
  useEffect(() => {
    onCursorUpdateRef.current = onCursorUpdate
  }, [onCursorUpdate])

  // Connect / disconnect when noteId or enabled changes
  useEffect(() => {
    if (!noteId || !enabled) return

    const supabase = requireSupabase()
    const channelName = `note:${noteId}`

    const channel: RealtimeChannel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: userId },
      },
    })

    // ── Presence ──────────────────────────────────────────────
    channel.on('presence', { event: 'sync' }, () => {
      const presence = channel.presenceState() as unknown as Record<string, Record<string, Record<string, unknown>>>
      const present: Collaborator[] = []

      for (const key of Object.keys(presence)) {
        if (key === userId) continue
        const entries = Object.values(presence[key] ?? {})
        for (const value of entries) {
          if (value?.userId) {
            present.push({
              userId: String(value.userId),
              username: value.username as string ?? '',
              avatarUrl: value.avatarUrl as string | null ?? null,
            })
          }
        }
      }

      setCollaborators(present)
    })

    // ── Block update listener ─────────────────────────────────
    channel.on(
      'broadcast',
      { event: 'blocks_update' },
      (payload: { payload: BlocksUpdatePayload }) => {
        onBlocksReceivedRef.current(payload.payload)
      },
    )

    // ── Cursor update listener ────────────────────────────────
    channel.on(
      'broadcast',
      { event: 'cursor_update' },
      (payload: { payload: CursorUpdatePayload }) => {
        const p = payload.payload
        if (p.userId === userId) return // skip self
        setRemoteCursors(prev => ({
          ...prev,
          [p.userId]: { userId: p.userId, blockId: p.blockId, username: p.username },
        }))
        onCursorUpdateRef.current?.(p)
      },
    )

    // ── Subscribe ─────────────────────────────────────────────
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId,
          username,
          avatarUrl,
          onlineAt: Date.now(),
        })
      }
    })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
      setCollaborators([])
      setRemoteCursors({})
    }
  }, [noteId, enabled, userId, username, avatarUrl])

  // ── Broadcast blocks ────────────────────────────────────────
  const broadcast = useCallback(
    (payload: Omit<BlocksUpdatePayload, 'type'>) => {
      const channel = channelRef.current
      if (!channel) return

      channel.send({
        type: 'broadcast',
        event: 'blocks_update',
        payload: { type: 'blocks_update', ...payload } satisfies BlocksUpdatePayload,
      })
    },
    [],
  )

  // ── Broadcast cursor ───────────────────────────────────────
  const broadcastCursor = useCallback(
    (blockId: string | null) => {
      const channel = channelRef.current
      if (!channel) return

      channel.send({
        type: 'broadcast',
        event: 'cursor_update',
        payload: {
          type: 'cursor_update',
          blockId,
          userId,
          username,
        } satisfies CursorUpdatePayload,
      })
    },
    [userId, username],
  )

  return { collaborators, broadcast, broadcastCursor, remoteCursors }
}

export { avatarColor }
