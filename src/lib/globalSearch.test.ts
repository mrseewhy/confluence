import { describe, it, expect } from 'vitest'
import { hitHref, normaliseHits, KIND_META } from './globalSearch'

describe('hitHref', () => {
  it('routes notes to /<owner>/n/<slug>', () => {
    expect(
      hitHref({ kind: 'note', id: '1', title: 'T', subtitle: null, slug: 'my-note', owner_username: 'sarah-chen', updated_at: null }),
    ).toBe('/sarah-chen/n/my-note')
  })

  it('routes folders to /<owner>/folder/<slug>', () => {
    expect(
      hitHref({ kind: 'folder', id: '2', title: 'F', subtitle: null, slug: 'workflows', owner_username: 'alex', updated_at: null }),
    ).toBe('/alex/folder/workflows')
  })

  it('routes people to /<username>', () => {
    expect(
      hitHref({ kind: 'person', id: '3', title: 'Marcus', subtitle: null, slug: 'marcus-rivera', owner_username: 'marcus-rivera', updated_at: null }),
    ).toBe('/marcus-rivera')
  })

  it('falls back to the dashboard instead of emitting an empty segment', () => {
    const href = hitHref({ kind: 'note', id: '1', title: 'T', subtitle: null, slug: 'x', owner_username: null, updated_at: null })
    expect(href).toBe('/dashboard')
    expect(href).not.toContain('undefined')
    expect(href).not.toContain('//')
  })
})

describe('normaliseHits', () => {
  it('returns [] for non-array input', () => {
    expect(normaliseHits(null)).toEqual([])
    expect(normaliseHits({})).toEqual([])
  })

  it('maps RPC rows and defaults missing titles', () => {
    const out = normaliseHits([
      { kind: 'note', id: 'a', title: 'Hello', subtitle: 'desc', slug: 's', owner_username: 'u', updated_at: '2026-01-01' },
      { kind: 'person', id: 'b' },
    ])
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ kind: 'note', title: 'Hello', subtitle: 'desc' })
    expect(out[1].title).toBe('Untitled')
    expect(out[1].subtitle).toBeNull()
  })
})

describe('KIND_META', () => {
  it('has an entry for every hit kind', () => {
    expect(Object.keys(KIND_META).sort()).toEqual(['folder', 'note', 'person'])
  })
})
