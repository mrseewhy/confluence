import { useState, useEffect, useCallback } from 'react'

interface UseDebouncedSearchOptions {
  /** Delay in ms before the debounced value updates (default: 300) */
  delay?: number
  /** Callback when search changes (e.g. to reset page number) */
  onSearchChange?: () => void
}

interface UseDebouncedSearchReturn {
  /** Raw search value (updates on every keystroke) */
  search: string
  /** Set the raw search value */
  setSearch: (value: string) => void
  /** Debounced search value (updates after the delay) */
  debouncedSearch: string
}

/**
 * A shared hook for debounced search input used across dashboard and admin pages.
 * Returns both the raw (immediate) and debounced search values.
 *
 * Example:
 *   const { search, setSearch, debouncedSearch } = useDebouncedSearch({ delay: 300 })
 */
export function useDebouncedSearch(options: UseDebouncedSearchOptions = {}): UseDebouncedSearchReturn {
  const { delay = 300, onSearchChange } = options
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce effect
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      onSearchChange?.()
    }, delay)
    return () => clearTimeout(t)
  }, [search, delay, onSearchChange])

  return { search, setSearch, debouncedSearch }
}
