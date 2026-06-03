import type { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

interface PageLayoutProps {
  children: ReactNode
  /** Remove max-width constraint for full-bleed layouts */
  fullWidth?: boolean
  /** Remove footer (useful for auth pages) */
  noFooter?: boolean
  /** Remove navbar (useful for auth pages) */
  noNavbar?: boolean
}

export function PageLayout({
  children,
  fullWidth = false,
  noFooter = false,
  noNavbar = false,
}: PageLayoutProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'var(--color-bg-base)',
    }}>
      {!noNavbar && <Navbar />}

      <main style={{
        flex: 1,
        width: '100%',
        maxWidth: fullWidth ? '100%' : '1200px',
        margin: '0 auto',
        padding: fullWidth ? '0' : '0 var(--space-6)',
      }}>
        {children}
      </main>

      {!noFooter && <Footer />}
    </div>
  )
}
