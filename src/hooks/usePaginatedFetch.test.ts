import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePaginatedFetch } from './usePaginatedFetch'

describe('usePaginatedFetch', () => {
  it('returns default values when no options provided', () => {
    const { result } = renderHook(() => usePaginatedFetch())

    expect(result.current.page).toBe(1)
    expect(result.current.pageSize).toBe(20)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.hasPrev).toBe(false)
    expect(result.current.hasNext).toBe(false)
    expect(result.current.rangeFrom).toBe(0)
    expect(result.current.rangeTo).toBe(19)
  })

  it('accepts custom initial page', () => {
    const { result } = renderHook(() =>
      usePaginatedFetch({ initialPage: 3 }),
    )

    expect(result.current.page).toBe(3)
  })

  it('computes correct total pages from total count', () => {
    const { result } = renderHook(() =>
      usePaginatedFetch({ totalCount: 50, pageSize: 20 }),
    )

    expect(result.current.totalPages).toBe(3)
    expect(result.current.hasNext).toBe(true)
    expect(result.current.hasPrev).toBe(false)
  })

  it('computes correct Supabase range values', () => {
    const { result } = renderHook(() =>
      usePaginatedFetch({ totalCount: 100, pageSize: 10, initialPage: 1 }),
    )

    expect(result.current.rangeFrom).toBe(0)
    expect(result.current.rangeTo).toBe(9)

    act(() => { result.current.setPage(2) })

    expect(result.current.rangeFrom).toBe(10)
    expect(result.current.rangeTo).toBe(19)
  })

  it('setPage clamps to minimum of 1', () => {
    const { result } = renderHook(() => usePaginatedFetch())

    act(() => { result.current.setPage(0) })
    expect(result.current.page).toBe(1)

    act(() => { result.current.setPage(-5) })
    expect(result.current.page).toBe(1)
  })

  it('navigates forward and backward with nextPage / prevPage', () => {
    const { result } = renderHook(() =>
      usePaginatedFetch({ totalCount: 50, pageSize: 20 }),
    )

    expect(result.current.page).toBe(1)

    act(() => { result.current.nextPage() })
    expect(result.current.page).toBe(2)
    expect(result.current.hasPrev).toBe(true)

    act(() => { result.current.prevPage() })
    expect(result.current.page).toBe(1)
    expect(result.current.hasPrev).toBe(false)
  })

  it('does not exceed totalPages on nextPage', () => {
    const { result } = renderHook(() =>
      usePaginatedFetch({ totalCount: 50, pageSize: 20, initialPage: 3 }),
    )

    // Page 3 is the last page (50 items / 20 per page = 3 pages)
    act(() => { result.current.nextPage() })
    expect(result.current.page).toBe(3) // stays at max
    expect(result.current.hasNext).toBe(false)
  })

  it('does not go below page 1 on prevPage', () => {
    const { result } = renderHook(() => usePaginatedFetch())

    act(() => { result.current.prevPage() })
    expect(result.current.page).toBe(1)
  })

  it('resetPage returns to page 1', () => {
    const { result } = renderHook(() =>
      usePaginatedFetch({ initialPage: 5 }),
    )

    act(() => { result.current.resetPage() })
    expect(result.current.page).toBe(1)
  })

  it('recomputes totalPages when totalCount changes via rerender', () => {
    const { result, rerender } = renderHook(
      (opts) => usePaginatedFetch(opts),
      { initialProps: { totalCount: 10, pageSize: 20 } },
    )

    expect(result.current.totalPages).toBe(1)

    rerender({ totalCount: 100, pageSize: 20 })

    expect(result.current.totalPages).toBe(5)
    expect(result.current.hasNext).toBe(true)
  })

  it('computes hasNext and hasPrev correctly at boundaries', () => {
    const { result } = renderHook(() =>
      usePaginatedFetch({ totalCount: 60, pageSize: 20 }),
    )

    // Page 1: hasPrev=false, hasNext=true
    expect(result.current.hasPrev).toBe(false)
    expect(result.current.hasNext).toBe(true)

    act(() => { result.current.nextPage() }) // page 2

    expect(result.current.hasPrev).toBe(true)
    expect(result.current.hasNext).toBe(true)

    act(() => { result.current.nextPage() }) // page 3

    expect(result.current.hasPrev).toBe(true)
    expect(result.current.hasNext).toBe(false)
  })

  it('handles zero totalCount gracefully', () => {
    const { result } = renderHook(() =>
      usePaginatedFetch({ totalCount: 0 }),
    )

    expect(result.current.totalPages).toBe(1)
    expect(result.current.hasNext).toBe(false)
    expect(result.current.hasPrev).toBe(false)
  })
})
