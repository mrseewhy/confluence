import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from './Toast'

// ── Helper component that uses the toast context ─────────────

function TestHarness() {
  const { addToast } = useToast()
  return (
    <div>
      <button
        data-testid="show-toast"
        onClick={() => addToast('Test message', 'success', {
          label: 'Undo',
          onClick: vi.fn(),
        })}
      >
        Show toast
      </button>
      <button
        data-testid="show-plain-toast"
        onClick={() => addToast('Plain message', 'info')}
      >
        Show plain toast
      </button>
    </div>
  )
}

// ── Setup ────────────────────────────────────────────────────

function renderWithToast() {
  return render(
    <ToastProvider>
      <TestHarness />
    </ToastProvider>,
  )
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the toast message when triggered', async () => {
    renderWithToast()
    await userEvent.click(screen.getByTestId('show-toast'))

    expect(screen.getByText('Test message')).toBeDefined()
    expect(screen.getByText('Undo')).toBeDefined()
  })

  it('shows checkmark when action button is clicked', async () => {
    renderWithToast()
    await userEvent.click(screen.getByTestId('show-toast'))

    const undoButton = screen.getByText('Undo')
    await userEvent.click(undoButton)

    // Button should now show checkmark
    expect(screen.getByText('✓')).toBeDefined()
  })

  it('fires the action callback when undo is clicked', async () => {
    const onClick = vi.fn()
    function CustomHarness() {
      const { addToast } = useToast()
      return (
        <button
          data-testid="custom-toast"
          onClick={() => addToast('Custom', 'success', {
            label: 'Undo',
            onClick,
          })}
        >
          Show
        </button>
      )
    }
    render(
      <ToastProvider>
        <CustomHarness />
      </ToastProvider>,
    )

    await userEvent.click(screen.getByTestId('custom-toast'))
    await userEvent.click(screen.getByText('Undo'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('prevents double-click on action button', async () => {
    const onClick = vi.fn()
    function CustomHarness() {
      const { addToast } = useToast()
      return (
        <button
          data-testid="custom-toast"
          onClick={() => addToast('Double', 'success', {
            label: 'Undo',
            onClick,
          })}
        >
          Show
        </button>
      )
    }
    render(
      <ToastProvider>
        <CustomHarness />
      </ToastProvider>,
    )

    await userEvent.click(screen.getByTestId('custom-toast'))
    const undoButton = screen.getByText('Undo')
    await userEvent.click(undoButton)
    // Second click should be ignored (early return from clickedActionId)
    await userEvent.click(undoButton)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('auto-dismisses the toast after 3500ms', async () => {
    renderWithToast()
    await userEvent.click(screen.getByTestId('show-toast'))

    expect(screen.queryByText('Test message')).toBeDefined()

    // Advance time by 3500ms
    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(screen.queryByText('Test message')).toBeNull()
  })

  it('renders error-type toast with correct message', async () => {
    function ErrorHarness() {
      const { addToast } = useToast()
      return (
        <button
          data-testid="error-toast"
          onClick={() => addToast('Something went wrong', 'error')}
        >
          Show error
        </button>
      )
    }
    render(
      <ToastProvider>
        <ErrorHarness />
      </ToastProvider>,
    )
    await userEvent.click(screen.getByTestId('error-toast'))

    expect(screen.getByText('Something went wrong')).toBeDefined()
  })

  it('renders info-type toast', async () => {
    renderWithToast()
    await userEvent.click(screen.getByTestId('show-plain-toast'))

    expect(screen.getByText('Plain message')).toBeDefined()
  })

  it('handles rapid consecutive toasts', async () => {
    function RapidHarness() {
      const { addToast } = useToast()
      return (
        <button
          data-testid="rapid-toast"
          onClick={() => {
            addToast('First', 'success')
            addToast('Second', 'error')
            addToast('Third', 'info')
          }}
        >
          Show all
        </button>
      )
    }
    render(
      <ToastProvider>
        <RapidHarness />
      </ToastProvider>,
    )
    await userEvent.click(screen.getByTestId('rapid-toast'))

    expect(screen.getByText('First')).toBeDefined()
    expect(screen.getByText('Second')).toBeDefined()
    expect(screen.getByText('Third')).toBeDefined()
  })

  it('renders a toast with a very long message', async () => {
    const longMsg = 'A'.repeat(500)
    function LongHarness() {
      const { addToast } = useToast()
      return (
        <button
          data-testid="long-toast"
          onClick={() => addToast(longMsg, 'info', {
            label: 'Undo',
            onClick: vi.fn(),
          })}
        >
          Show long
        </button>
      )
    }
    render(
      <ToastProvider>
        <LongHarness />
      </ToastProvider>,
    )
    await userEvent.click(screen.getByTestId('long-toast'))

    expect(screen.getByText(longMsg)).toBeDefined()
    expect(screen.getByText('Undo')).toBeDefined()
  })

  it('dismisses toast when dismiss button is clicked', async () => {
    renderWithToast()
    await userEvent.click(screen.getByTestId('show-toast'))

    const dismissButton = screen.getByLabelText('Dismiss')
    await userEvent.click(dismissButton)

    expect(screen.queryByText('Test message')).toBeNull()
  })

  it('clears the toast after undo completes (600ms delay)', async () => {
    renderWithToast()
    await userEvent.click(screen.getByTestId('show-toast'))

    await userEvent.click(screen.getByText('Undo'))

    // Toast should still be visible during the 600ms animation
    expect(screen.getByText('Test message')).toBeDefined()

    // Advance time by 600ms
    act(() => {
      vi.advanceTimersByTime(600)
    })

    // Toast should be dismissed after animation completes
    expect(screen.queryByText('Test message')).toBeNull()
  })
})
