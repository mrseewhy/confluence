import { describe, it, expect } from 'vitest'
import { formatDate, timeAgo, buildSlug } from './helpers'

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    const result = formatDate('2025-06-01T10:00:00Z')
    expect(result).toMatch(/Jun 1, 2025/)
  })
})

describe('timeAgo', () => {
  it('shows minutes for recent dates', () => {
    const recent = new Date(Date.now() - 5 * 60000).toISOString()
    expect(timeAgo(recent)).toMatch(/m ago/)
  })
})

describe('buildSlug', () => {
  it('converts a title to a URL-safe slug', () => {
    expect(buildSlug('My New Note!')).toBe('my-new-note')
  })

  it('trims leading/trailing dashes', () => {
    expect(buildSlug('--hello--')).toBe('hello')
  })

  it('handles empty strings', () => {
    expect(buildSlug('')).toBe('')
  })
})
