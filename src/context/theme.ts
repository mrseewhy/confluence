import { createContext, use } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  isDark: boolean
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext)

  if (!context) {
    throw new Error(
      'useTheme must be used inside a <ThemeProvider>. ' +
      'Wrap your app root with <ThemeProvider>.',
    )
  }

  return context
}
