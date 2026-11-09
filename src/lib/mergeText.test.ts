import { describe, it, expect } from 'vitest'
import { mergeText } from './mergeText'

describe('mergeText — character level three-way merge', () => {
  it('takes theirs when mine is unchanged', () => {
    const r = mergeText('hello world', 'hello world', 'hello there world')
    expect(r.clean).toBe(true)
    expect(r.text).toBe('hello there world')
  })

  it('takes mine when theirs is unchanged', () => {
    const r = mergeText('hello world', 'hello brave world', 'hello world')
    expect(r.clean).toBe(true)
    expect(r.text).toBe('hello brave world')
  })

  it('returns the common result when both made the same edit', () => {
    const r = mergeText('a b', 'a B', 'a B')
    expect(r.clean).toBe(true)
    expect(r.text).toBe('a B')
  })

  it('merges edits to DIFFERENT parts of the same paragraph (the key case)', () => {
    // Two people working in the same paragraph, far apart.
    const base = 'The quick brown fox jumps over the lazy dog.'
    const mine = 'The VERY quick brown fox jumps over the lazy dog.'
    const theirs = 'The quick brown fox jumps over the lazy dog!'
    const r = mergeText(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.text).toBe('The VERY quick brown fox jumps over the lazy dog!')
  })

  it('merges an insertion and a deletion that do not overlap', () => {
    const base = 'one two three four'
    const mine = 'one two three four five' // appended
    const theirs = 'one three four' // removed "two "
    const r = mergeText(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.text).toBe('one three four five')
  })

  it('merges two edits in the middle separated by untouched text', () => {
    const base = 'alpha beta gamma delta epsilon'
    const mine = 'alpha BETA1 beta gamma delta epsilon'
    const theirs = 'alpha beta gamma delta EPSILON2'
    const r = mergeText(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.text).toBe('alpha BETA1 beta gamma delta EPSILON2')
  })

  it('reports a conflict when both change the SAME characters differently', () => {
    const base = 'the price is 10 dollars'
    const mine = 'the price is 20 dollars'
    const theirs = 'the price is 30 dollars'
    const r = mergeText(base, mine, theirs)
    expect(r.clean).toBe(false)
    const conflict = r.segments.find((s) => s.kind === 'conflict')
    expect(conflict).toBeDefined()
    expect(conflict?.mine).toBe('20')
    expect(conflict?.theirs).toBe('30')
    // The clean text keeps our side so nothing is lost silently.
    expect(r.text).toBe('the price is 20 dollars')
  })

  it('treats identical overlapping edits as agreement, not a conflict', () => {
    const base = 'colour'
    const mine = 'color'
    const theirs = 'color'
    expect(mergeText(base, mine, theirs).clean).toBe(true)
  })

  it('merges appends at the same place only if identical', () => {
    const base = 'text'
    expect(mergeText(base, 'text A', 'text A').clean).toBe(true)
    const r = mergeText(base, 'text A', 'text B')
    expect(r.clean).toBe(false)
  })

  it('handles an empty base (both typed from scratch)', () => {
    const r = mergeText('', 'abc', 'abc')
    expect(r.clean).toBe(true)
    expect(r.text).toBe('abc')
  })

  it('handles one side emptying the block', () => {
    const r = mergeText('some text', '', 'some text')
    expect(r.clean).toBe(true)
    expect(r.text).toBe('')
  })

  it('does not split surrogate pairs (emoji)', () => {
    const base = 'happy 😀 day'
    const mine = 'happy 😀😀 day'
    const theirs = 'happy 😀 day!'
    const r = mergeText(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.text).toBe('happy 😀😀 day!')
    // No lone surrogates should survive.
    expect([...r.text].every((c) => c.length <= 2)).toBe(true)
  })

  it('handles multi-line block content', () => {
    const base = 'line one\nline two\nline three'
    const mine = 'line ONE\nline two\nline three'
    const theirs = 'line one\nline two\nline THREE'
    const r = mergeText(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.text).toBe('line ONE\nline two\nline THREE')
  })

  it('exposes a conflict segment with the base text for context', () => {
    const r = mergeText('aaa', 'Xaa', 'Yaa')
    expect(r.clean).toBe(false)
    const c = r.segments.find((s) => s.kind === 'conflict')
    // Widened to the whole word so the reader sees something meaningful.
    expect(c?.base).toBe('aaa')
    expect(c?.mine).toBe('Xaa')
    expect(c?.theirs).toBe('Yaa')
  })

  it('keeps segments in order and loses no clean text', () => {
    const base = 'one two three'
    const r = mergeText(base, 'ONE two three', 'one two THREE')
    expect(r.clean).toBe(true)
    expect(r.segments.map((s) => s.text).join('')).toBe(r.text)
  })
})
