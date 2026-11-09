import { describe, it, expect } from 'vitest'
import { diffLines, blocksToLines, isUnchanged } from './diff'

describe('diffLines', () => {
  it('marks identical lines as equal', () => {
    const d = diffLines(['a', 'b'], ['a', 'b'])
    expect(d.map((x) => x.op)).toEqual(['equal', 'equal'])
    expect(isUnchanged(d)).toBe(true)
  })

  it('detects an added line', () => {
    const d = diffLines(['a', 'b'], ['a', 'x', 'b'])
    expect(d).toEqual([
      { op: 'equal', text: 'a' },
      { op: 'add', text: 'x' },
      { op: 'equal', text: 'b' },
    ])
    expect(isUnchanged(d)).toBe(false)
  })

  it('detects a removed line', () => {
    const d = diffLines(['a', 'x', 'b'], ['a', 'b'])
    expect(d.filter((x) => x.op === 'remove')).toEqual([{ op: 'remove', text: 'x' }])
  })

  it('handles a replaced line', () => {
    const d = diffLines(['old'], ['new'])
    expect(d.map((x) => `${x.op}:${x.text}`)).toEqual(['remove:old', 'add:new'])
  })

  it('handles empty inputs', () => {
    expect(diffLines([], [])).toEqual([])
    expect(diffLines([], ['a'])).toEqual([{ op: 'add', text: 'a' }])
    expect(diffLines(['a'], [])).toEqual([{ op: 'remove', text: 'a' }])
  })

  it('preserves order of every original and new line', () => {
    const before = ['one', 'two', 'three', 'four']
    const after = ['one', 'three', 'four', 'five']
    const d = diffLines(before, after)
    expect(d.filter((x) => x.op !== 'add').map((x) => x.text)).toEqual(before)
    expect(d.filter((x) => x.op !== 'remove').map((x) => x.text)).toEqual(after)
  })
})

describe('blocksToLines', () => {
  it('sorts by order_index', () => {
    const lines = blocksToLines([
      { type: 'text', content: 'second', order_index: 1 },
      { type: 'text', content: 'first', order_index: 0 },
    ])
    expect(lines).toEqual(['first', 'second'])
  })

  it('prefixes non-text blocks with their type', () => {
    const lines = blocksToLines([{ type: 'code', content: 'const x = 1', order_index: 0 }])
    expect(lines[0]).toBe('[code] const x = 1')
  })

  it('splits multi-line content', () => {
    const lines = blocksToLines([{ type: 'text', content: 'a\nb', order_index: 0 }])
    expect(lines).toEqual(['a', 'b'])
  })

  it('returns [] for invalid input', () => {
    expect(blocksToLines(null)).toEqual([])
    expect(blocksToLines(undefined)).toEqual([])
  })
})
