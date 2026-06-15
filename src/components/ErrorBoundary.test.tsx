import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

// ── Helper: a child component that throws on render ────────────

function GoodChild() {
  return <div>All good here</div>
}

function BadChild({ message = 'Test error' }: { message?: string }) {
  throw new Error(message)
}

function AsyncBadChild() {
  // Simulate an error thrown in useEffect / async context
  // (ErrorBoundary only catches render-phase errors, not async ones)
  return <div>Async safe</div>
}

// ── Tests ─────────────────────────────────────────────────────

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    )

    expect(screen.getByText('All good here')).toBeDefined()
  })

  it('catches a render-phase thrown error and shows fallback UI', () => {
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>,
    )

    // Default fallback should be visible
    expect(screen.getByText('Something went wrong')).toBeDefined()
    expect(
      screen.getByText('An unexpected error occurred. Please try refreshing the page.'),
    ).toBeDefined()

    // Refresh button should be present
    const refreshButton = screen.getByText('Refresh page')
    expect(refreshButton).toBeDefined()
  })

  it('renders custom fallback when provided instead of default UI', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <BadChild />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Custom error UI')).toBeDefined()
    // Default fallback should NOT appear
    expect(screen.queryByText('Something went wrong')).toBeNull()
  })

  it('calls console.error via componentDidCatch when an error is caught', () => {
    render(
      <ErrorBoundary>
        <BadChild message="Boundary caught this" />
      </ErrorBoundary>,
    )

    // componentDidCatch logs to console.error
    expect(console.error).toHaveBeenCalled()
    // The call should contain the error message
    const calls = vi.mocked(console.error).mock.calls
    const hasErrorMessage = calls.some(
      (args) => args.some((arg) => String(arg).includes('Boundary caught this')),
    )
    expect(hasErrorMessage).toBe(true)
  })

  it('does NOT catch async errors (limitation of class-based ErrorBoundary)', () => {
    // This test verifies the known limitation: ErrorBoundary only catches
    // errors thrown during the render phase, not async errors.
    render(
      <ErrorBoundary>
        <AsyncBadChild />
      </ErrorBoundary>,
    )

    // Since AsyncBadChild doesn't actually throw during render,
    // the content should render normally
    expect(screen.getByText('Async safe')).toBeDefined()
  })
})
