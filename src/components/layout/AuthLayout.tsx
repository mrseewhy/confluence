import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ThemeToggle'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  footerText?: string
  footerLinkLabel?: string
  footerLinkHref?: string
}

export function AuthLayout({
  children,
  title,
  subtitle,
  footerText,
  footerLinkLabel,
  footerLinkHref,
}: AuthLayoutProps) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-base)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Top bar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-6)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <Link to="/" style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-bold)',
          letterSpacing: 'var(--letter-spacing-tight)',
          color: 'var(--color-text-primary)',
          textDecoration: 'none',
        }}>
          confluence
        </Link>
        <ThemeToggle />
      </header>

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
        }}>

          {/* Card */}
          <div style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'var(--space-10)',
            boxShadow: 'var(--shadow-lg)',
          }}>

            {/* Heading */}
            <div style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-accent-subtle)',
                border: '1px solid var(--color-accent-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-5)',
                fontSize: '20px',
              }}>
                ✦
              </div>
              <h2 style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                letterSpacing: 'var(--letter-spacing-tight)',
                color: 'var(--color-text-primary)',
                marginBottom: subtitle ? 'var(--space-2)' : '0',
              }}>
                {title}
              </h2>
              {subtitle && (
                <p style={{
                  margin: 0,
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}>
                  {subtitle}
                </p>
              )}
            </div>

            {children}
          </div>

          {/* Footer link */}
          {footerText && footerLinkLabel && footerLinkHref && (
            <p style={{
              textAlign: 'center',
              marginTop: 'var(--space-6)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-muted)',
            }}>
              {footerText}{' '}
              <Link to={footerLinkHref} style={{
                color: 'var(--color-accent)',
                fontWeight: 'var(--font-weight-medium)',
                textDecoration: 'none',
              }}>
                {footerLinkLabel}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
