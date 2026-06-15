import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

// ── Types ─────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

interface Toast {
  id: string
  message: string
  type: ToastType
  action?: ToastAction
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, action?: ToastAction) => void
}

// ── Context ───────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

// ── Provider ──────────────────────────────────────────────────

let toastCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [clickedActionId, setClickedActionId] = useState<string | null>(null)

  const addToast = useCallback((message: string, type: ToastType = 'info', action?: ToastAction) => {
    const id = `toast-${++toastCounter}-${Date.now()}`
    setToasts(prev => [...prev, { id, message, type, action }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toastColor = (type: ToastType) => {
    switch (type) {
      case 'success': return 'var(--color-success)'
      case 'error':   return 'var(--color-danger)'
      case 'info':    return 'var(--color-accent)'
    }
  }

  const toastBg = (type: ToastType) => {
    switch (type) {
      case 'success': return 'var(--color-success-subtle)'
      case 'error':   return 'var(--color-danger-subtle)'
      case 'info':    return 'var(--color-accent-subtle)'
    }
  }

  return (
    <ToastContext value={{ addToast }}>
      {children}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-atomic="false"
          style={{
            position: 'fixed',
            bottom: 'var(--space-6)',
            right: 'var(--space-6)',
            zIndex: 300,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            maxWidth: 360,
          }}
        >
          {toasts.map(toast => (
            <div
              key={toast.id}
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                border: `1px solid ${toastColor(toast.type)}`,
                background: toastBg(toast.type),
                color: toastColor(toast.type),
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                fontFamily: 'var(--font-sans)',
                boxShadow: 'var(--shadow-md)',
                animation: 'toastSlideIn 0.2s ease-out',
              }}
            >
              <span>{toast.message}</span>
              {toast.action && (
                <button
                  onClick={() => {
                    if (clickedActionId === toast.id) return
                    setClickedActionId(toast.id)
                    toast.action!.onClick()
                    setTimeout(() => {
                      removeToast(toast.id)
                      setClickedActionId(null)
                    }, 600)
                  }}
                  style={{
                    background: clickedActionId === toast.id ? 'transparent' : 'transparent',
                    border: clickedActionId === toast.id
                      ? `1px solid ${toastColor(toast.type)}`
                      : `1px solid ${toastColor(toast.type)}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: clickedActionId === toast.id ? 'default' : 'pointer',
                    color: 'inherit',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                    padding: '2px 8px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    transform: clickedActionId === toast.id ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {clickedActionId === toast.id ? '✓' : toast.action.label}
                </button>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  fontSize: 'var(--font-size-base)',
                  lineHeight: 1,
                  padding: 0,
                  opacity: 0.7,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext>
  )
}
