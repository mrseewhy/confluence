import { describe, it, expect, beforeEach } from 'vitest'

describe('localStorage mock', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getItem returns null for missing keys (not undefined)', () => {
    const result = localStorage.getItem('nonexistent-key')
    // Real localStorage returns null for missing keys, not undefined
    expect(result).toBeNull()
  })

  it('setItem stores values and getItem retrieves them', () => {
    localStorage.setItem('key1', 'value1')
    localStorage.setItem('key2', 'value2')
    expect(localStorage.getItem('key1')).toBe('value1')
    expect(localStorage.getItem('key2')).toBe('value2')
  })

  it('clear() resets the store between tests', () => {
    localStorage.setItem('test-key', 'test-value')
    expect(localStorage.getItem('test-key')).toBe('test-value')

    localStorage.clear()
    expect(localStorage.getItem('test-key')).toBeNull()
  })

  it('removeItem deletes a specific key', () => {
    localStorage.setItem('a', '1')
    localStorage.setItem('b', '2')
    localStorage.removeItem('a')
    expect(localStorage.getItem('a')).toBeNull()
    expect(localStorage.getItem('b')).toBe('2')
  })

  it('getItem returns null for explicitly removed keys', () => {
    localStorage.setItem('temp', 'data')
    localStorage.removeItem('temp')
    expect(localStorage.getItem('temp')).toBeNull()
  })

  it('stores and retrieves JSON-serialized strings', () => {
    const data = { title: 'Test', blocks: [{ type: 'text', content: 'hello' }] }
    localStorage.setItem('json-key', JSON.stringify(data))
    const raw = localStorage.getItem('json-key')
    expect(raw).toBeTypeOf('string')
    const parsed = JSON.parse(raw!)
    expect(parsed).toEqual(data)
  })

  it('supports multiple keys independently', () => {
    localStorage.setItem('alpha', 'first')
    localStorage.setItem('beta', 'second')
    localStorage.setItem('gamma', 'third')

    expect(localStorage.getItem('alpha')).toBe('first')
    expect(localStorage.getItem('beta')).toBe('second')
    expect(localStorage.getItem('gamma')).toBe('third')

    // Removing one doesn't affect others
    localStorage.removeItem('beta')
    expect(localStorage.getItem('alpha')).toBe('first')
    expect(localStorage.getItem('beta')).toBeNull()
    expect(localStorage.getItem('gamma')).toBe('third')
  })

  it('clear resets for the next test (simulated second test)', () => {
    // This simulates what happens when a previous test wrote data
    // and the next test clears it in its beforeEach
    expect(localStorage.getItem('test-key')).toBeNull()
    expect(localStorage.getItem('json-key')).toBeNull()
  })
})
