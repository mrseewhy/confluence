import { useState, useCallback, useMemo } from 'react'

interface UsePaginatedFetchOptions {
  /** Number of items per page (default: 20) */
  pageSize?: number
  /** Total number of items (set after fetch) */
  totalCount?: number
  /** Initial page (default: 1) */
  initialPage?: number
}

interface UsePaginatedFetchReturn {
  /** Current page number */
  page: number
  /** Set the current page directly */
  setPage: (page: number) => void
  /** Go to the next page */
  nextPage: () => void
  /** Go to the previous page */
  prevPage: () => void
  /** Reset to page 1 */
  resetPage: () => void
  /** Number of items per page */
  pageSize: number
  /** Total pages (computed from totalCount / pageSize) */
  totalPages: number
  /** Whether there is a next page */
  hasNext: boolean
  /** Whether there is a previous page */
  hasPrev: boolean
  /** Supabase-compatible range start */
  rangeFrom: number
  /** Supabase-compatible range end */
  rangeTo: number
}

/**
 * A shared hook for pagination state management used across dashboard and admin pages.
 * Computes Supabase-compatible range values and provides navigation helpers.
 *
 * Usage in a Supabase query:
 *   const { page, setPage, resetPage, rangeFrom, rangeTo } = usePaginatedFetch({ totalCount })
 *   const { data } = await supabase.from('items').select('*').range(rangeFrom, rangeTo)
 */
export function usePaginatedFetch(options: UsePaginatedFetchOptions = {}): UsePaginatedFetchReturn {
  const { pageSize = 20, totalCount = 0, initialPage = 1 } = options
  const [page, setPageState] = useState(initialPage)

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize],
  )

  const rangeFrom = useMemo(() => (page - 1) * pageSize, [page, pageSize])
  const rangeTo = useMemo(() => rangeFrom + pageSize - 1, [rangeFrom, pageSize])

  const hasNext = page < totalPages
  const hasPrev = page > 1

  const setPage = useCallback((p: number) => {
    setPageState(Math.max(1, p))
  }, [])

  const nextPage = useCallback(() => {
    setPageState(prev => Math.min(prev + 1, totalPages))
  }, [totalPages])

  const prevPage = useCallback(() => {
    setPageState(prev => Math.max(1, prev - 1))
  }, [])

  const resetPage = useCallback(() => {
    setPageState(1)
  }, [])

  return {
    page,
    setPage,
    nextPage,
    prevPage,
    resetPage,
    pageSize,
    totalPages,
    hasNext,
    hasPrev,
    rangeFrom,
    rangeTo,
  }
}
