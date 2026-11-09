import { describe, it, expect } from 'vitest'
import { threeWayMerge, type MergeBlock } from './mergeBlocks'

const b = (id: string, content: string, type = 'paragraph'): MergeBlock => ({ id, type, content })

describe('threeWayMerge', () => {
  it('takes theirs when I did not change anything', () => {
    const base = [b('1', 'hello')]
    const mine = [b('1', 'hello')]
    const theirs = [b('1', 'hello world')]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.merged.map((x) => x.content)).toEqual(['hello world'])
  })

  it('takes mine when they did not change anything', () => {
    const base = [b('1', 'hello')]
    const mine = [b('1', 'mine')]
    const theirs = [b('1', 'hello')]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.merged.map((x) => x.content)).toEqual(['mine'])
  })

  it('returns mine when both sides made the same change', () => {
    const base = [b('1', 'a')]
    const mine = [b('1', 'b')]
    const theirs = [b('1', 'b')]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.merged.map((x) => x.content)).toEqual(['b'])
  })

  it('merges edits to DIFFERENT blocks — the common case', () => {
    const base = [b('1', 'one'), b('2', 'two')]
    const mine = [b('1', 'one EDITED BY ME'), b('2', 'two')]
    const theirs = [b('1', 'one'), b('2', 'two EDITED BY THEM')]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.merged.map((x) => x.content)).toEqual(['one EDITED BY ME', 'two EDITED BY THEM'])
  })

  it('reports a conflict when both changed the SAME block differently', () => {
    const base = [b('1', 'original')]
    const mine = [b('1', 'my version')]
    const theirs = [b('1', 'their version')]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(false)
    expect(r.conflicts).toEqual(['1'])
    // Keeps mine rather than silently choosing theirs.
    expect(r.merged.map((x) => x.content)).toEqual(['my version'])
  })

  it('handles a block added only by them', () => {
    const base = [b('1', 'one')]
    const mine = [b('1', 'one')]
    const theirs = [b('1', 'one'), b('2', 'theirs added')]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.merged.map((x) => x.content)).toEqual(['one', 'theirs added'])
  })

  it('handles a block added only by me', () => {
    const base = [b('1', 'one')]
    const mine = [b('1', 'one'), b('2', 'mine added')]
    const theirs = [b('1', 'one')]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.merged.map((x) => x.content)).toEqual(['one', 'mine added'])
  })

  it('handles a block deleted by them without resurrecting it', () => {
    const base = [b('1', 'one'), b('2', 'two')]
    const mine = [b('1', 'one'), b('2', 'two')]
    const theirs = [b('1', 'one')]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.merged.map((x) => x.content)).toEqual(['one'])
  })

  it('merges three-way across several blocks with one real conflict', () => {
    const base = [b('1', 'a'), b('2', 'b'), b('3', 'c')]
    const mine = [b('1', 'a-mine'), b('2', 'b'), b('3', 'c')]
    const theirs = [b('1', 'a-theirs'), b('2', 'b'), b('3', 'c-theirs')]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(false)
    expect(r.conflicts).toEqual(['1'])
    expect(r.merged.map((x) => x.content)).toEqual(['a-mine', 'b', 'c-theirs'])
  })

  it('refuses to merge when blocks have no ids (cannot align)', () => {
    const base = [{ type: 'paragraph', content: 'a' }]
    const mine = [{ type: 'paragraph', content: 'b' }]
    const theirs = [{ type: 'paragraph', content: 'c' }]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(false)
    expect(r.conflicts).toEqual(['*'])
  })

  it('treats an identical empty result as clean', () => {
    const r = threeWayMerge([], [], [])
    expect(r.clean).toBe(true)
    expect(r.merged).toEqual([])
  })

  it('does not treat a block type difference as a change (false-conflict bug)', () => {
    // The editor may normalise a block's type (text -> paragraph). If the type
    // took part in change detection, every block would look modified and every
    // concurrent edit would report a conflict.
    const base: MergeBlock[] = [
      { id: '1', type: 'paragraph', content: 'one' },
      { id: '2', type: 'paragraph', content: 'two' },
    ]
    const mine: MergeBlock[] = [
      { id: '1', type: 'text', content: 'one MINE' },
      { id: '2', type: 'text', content: 'two' },
    ]
    const theirs: MergeBlock[] = [
      { id: '1', type: 'paragraph', content: 'one' },
      { id: '2', type: 'paragraph', content: 'two THEIRS' },
    ]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.merged.map((x) => x.content)).toEqual(['one MINE', 'two THEIRS'])
  })

  it('merges two edits to DIFFERENT parts of the same paragraph', () => {
    // Previously this was reported as a conflict at block level. Character
    // level merging should reconcile it.
    const base = [b('1', 'The quick brown fox jumps over the lazy dog.')]
    const mine = [b('1', 'The VERY quick brown fox jumps over the lazy dog.')]
    const theirs = [b('1', 'The quick brown fox jumps over the lazy dog!')]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(true)
    expect(r.conflicts).toEqual([])
    expect(r.merged[0].content).toBe('The VERY quick brown fox jumps over the lazy dog!')
  })

  it('still conflicts when both change the SAME word differently', () => {
    const base = [b('1', 'the price is 10 dollars')]
    const mine = [b('1', 'the price is 20 dollars')]
    const theirs = [b('1', 'the price is 30 dollars')]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(false)
    expect(r.conflicts).toEqual(['1'])
  })

  it('ignores metadata differences in change detection', () => {
    const base = [{ id: '1', type: 'paragraph', content: 'x', metadata: { a: 1 } }]
    const mine = [{ id: '1', type: 'paragraph', content: 'x', metadata: { a: 2 } }]
    const theirs = [{ id: '1', type: 'paragraph', content: 'x', metadata: { a: 1 } }]
    const r = threeWayMerge(base, mine, theirs)
    expect(r.clean).toBe(true)
  })
})
