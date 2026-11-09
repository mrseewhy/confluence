import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ── Mocks ─────────────────────────────────────────────────────
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

// A fake realtime channel we can control from the test.
let changeHandler: (() => void) | null = null
const channelObj = {
  on: (_event: string, _filter: unknown, cb: () => void) => {
    changeHandler = cb
    return channelObj
  },
  subscribe: () => channelObj,
}

const rpcMock = vi.fn()
const notificationsQuery = vi.fn()
const removeChannel = vi.fn()

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => ({
    rpc: rpcMock,
    channel: () => channelObj,
    removeChannel,
    from: (table: string) => {
      if (table === 'notifications') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => notificationsQuery(),
              }),
            }),
          }),
        }
      }
      return {}
    },
  }),
}))

import { NotificationBell } from './NotificationBell'

beforeEach(() => {
  changeHandler = null
  rpcMock.mockReset().mockResolvedValue({ data: 2 })
  notificationsQuery.mockReset().mockResolvedValue({ data: [] })
  removeChannel.mockReset()
})

describe('NotificationBell', () => {
  it('loads the unread count on mount and subscribes to realtime', async () => {
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('unread_notification_count', { p_user_id: 'u1' }))
    // badge shows the unread count
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
    // subscription installed
    expect(changeHandler).toBeTypeOf('function')
  })

  it('refreshes the unread count when a realtime change arrives', async () => {
    render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1))
    rpcMock.mockResolvedValue({ data: 5 })
    // simulate a postgres change event
    changeHandler?.()
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument())
  })

  it('loads the list when opened and renders notifications', async () => {
    notificationsQuery.mockResolvedValue({
      data: [
        { id: 'n1', type: 'invite', title: 'New invite', body: 'Sarah shared a note', link: '/n/1', read: false, created_at: new Date().toISOString() },
      ],
    })
    render(<NotificationBell userId="u1" />)
    fireEvent.click(screen.getByLabelText('Notifications'))
    await waitFor(() => expect(screen.getByText('New invite')).toBeInTheDocument())
    expect(notificationsQuery).toHaveBeenCalled()
  })

  it('unsubscribes on unmount', async () => {
    const { unmount } = render(<NotificationBell userId="u1" />)
    await waitFor(() => expect(changeHandler).toBeTypeOf('function'))
    unmount()
    expect(removeChannel).toHaveBeenCalled()
  })
})
