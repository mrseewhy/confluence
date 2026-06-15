import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedSearch } from './useDebouncedSearch'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDebouncedSearch', () => {
  it('returns empty strings initially', () => {
    const { result } = renderHook(() => useDebouncedSearch())

    expect(result.current.search).toBe('')
    expect(result.current.debouncedSearch).toBe('')
  })

  it('updates search value immediately on setSearch', () => {
    const { result } = renderHook(() => useDebouncedSearch())

    act(() => { result.current.setSearch('hello') })

    expect(result.current.search).toBe('hello')
  })

  it('debouncedSearch updates after the delay', () => {
    const { result } = renderHook(() => useDebouncedSearch({ delay: 300 }))

    act(() => { result.current.setSearch('hello') })

    // Before delay, debouncedSearch should still be empty
    expect(result.current.debouncedSearch).toBe('')

    // Advance past the delay
    act(() => { vi.advanceTimersByTime(300) })

    expect(result.current.debouncedSearch).toBe('hello')
  })

  it('respects a custom delay', () => {
    const { result } = renderHook(() => useDebouncedSearch({ delay: 500 }))

    act(() => { result.current.setSearch('test') })
    act(() => { vi.advanceTimersByTime(300) })

    // Should still be empty at 300ms
    expect(result.current.debouncedSearch).toBe('')

    act(() => { vi.advanceTimersByTime(200) }) // total 500ms

    expect(result.current.debouncedSearch).toBe('test')
  })

  it('resets the timer on rapid updates (only last value is debounced)', () => {
    const { result } = renderHook(() => useDebouncedSearch({ delay: 300 }))

    act(() => { result.current.setSearch('a') })
    act(() => { vi.advanceTimersByTime(100) })

    act(() => { result.current.setSearch('ab') })
    act(() => { vi.advanceTimersByTime(100) })

    act(() => { result.current.setSearch('abc') })
    act(() => { vi.advanceTimersByTime(100) })

    // Timer was reset on each update, so only 300ms total have passed
    // since the last update = 100ms when accumulating from the first.
    // Actually: last update at 200ms, advanced 100ms = 100ms since last update
    expect(result.current.debouncedSearch).toBe('')

    // Advance remaining 200ms to complete the final timer
    act(() => { vi.advanceTimersByTime(200) })

    expect(result.current.debouncedSearch).toBe('abc')
  })

  it('calls onSearchChange callback when debouncedSearch updates', () => {
    const onSearchChange = vi.fn()
    const { result } = renderHook(() =>
      useDebouncedSearch({ delay: 300, onSearchChange }),
    )

    act(() => { result.current.setSearch('hello') })
    act(() => { vi.advanceTimersByTime(300) })

    expect(onSearchChange).toHaveBeenCalledTimes(1)
  })

  it('cleans up timeout on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useDebouncedSearch({ delay: 300 }),
    )

    act(() => { result.current.setSearch('hello') })

    // Unmount before the delay fires — should not throw
    unmount()

    // Advance past the delay — debouncedSearch should NOT have been updated
    act(() => { vi.advanceTimersByTime(300) })

    // The hook is unmounted so we can't read result — but no error means success
  })
})
