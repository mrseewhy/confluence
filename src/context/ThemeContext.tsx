import {
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { ThemeContext, type Theme, type ThemeContextValue } from '@/context/theme'

// ============================================================
// Helpers
// ============================================================

const STORAGE_KEY = 'confluence-theme'

/**
 * Reads preferred theme in priority order:
 * 1. localStorage (user previously chose)
 * 2. OS prefers-color-scheme
 * 3. Fallback: 'dark' (dark-first SaaS default)
 */
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'

  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'light' || stored === 'dark') return stored

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

/** Applies theme to <html> via data-theme attribute */
function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

// ============================================================
// Provider
// ============================================================

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return defaultTheme ?? getInitialTheme()
  })

  // Apply to <html> on every change + persist
  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  // Apply immediately on first paint to prevent flash
  useEffect(() => {
    applyTheme(getInitialTheme())
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const value: ThemeContextValue = {
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === 'dark',
  }

  // React 19: <Context value={...}> instead of <Context.Provider value={...}>
  return (
    <ThemeContext value={value}>
      {children}
    </ThemeContext>
  )
}
