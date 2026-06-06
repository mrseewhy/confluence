import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-4)',
            padding: 'var(--space-8)',
            background: 'var(--color-bg-base)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 48, lineHeight: 1 }}>⚠️</span>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: 400, margin: 0 }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => { window.location.reload() }}
            style={{
              marginTop: 'var(--space-2)',
              padding: '10px 24px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Refresh page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
