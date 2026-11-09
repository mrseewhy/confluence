import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  enqueueSave,
  dequeueSave,
  hasQueuedSaves,
  queuedCount,
  isQueued,
  readQueue,
  isOfflineError,
} from './offlineQueue'

const base = {
  noteId: 'n1',
  slug: 'my-note',
  userId: 'u1',
  title: 'Title',
  description: '',
  folder_id: null,
  visibility: 'private',
  blocks: [{ type: 'paragraph', content: 'hello', metadata: {} }],
  updatedAt: '2020-01-01T00:00:00Z',
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('offlineQueue', () => {
  it('starts empty', () => {
    expect(hasQueuedSaves()).toBe(false)
    expect(queuedCount()).toBe(0)
  })

  it('stores a save and reports it queued', () => {
    enqueueSave(base)
    expect(hasQueuedSaves()).toBe(true)
    expect(queuedCount()).toBe(1)
    expect(isQueued('n1', 'my-note')).toBe(true)
  })

  it('keeps only the newest payload for the same note', () => {
    enqueueSave(base)
    enqueueSave({ ...base, title: 'Updated' })
    expect(queuedCount()).toBe(1)
    expect(readQueue()['n1'].title).toBe('Updated')
  })

  it('keeps separate notes apart', () => {
    enqueueSave(base)
    enqueueSave({ ...base, noteId: 'n2', slug: 'other' })
    expect(queuedCount()).toBe(2)
  })

  it('keys unsaved notes by slug so a new note is still queued', () => {
    enqueueSave({ ...base, noteId: null })
    expect(isQueued(null, 'my-note')).toBe(true)
    expect(queuedCount()).toBe(1)
  })

  it('removes an entry on dequeue', () => {
    enqueueSave(base)
    dequeueSave('n1', 'my-note')
    expect(hasQueuedSaves()).toBe(false)
  })

  it('survives corrupt storage instead of throwing', () => {
    localStorage.setItem('confluence:offline-save-queue:v1', 'not json{{')
    expect(() => readQueue()).not.toThrow()
    expect(readQueue()).toEqual({})
  })

  it('ignores an array payload (wrong shape)', () => {
    localStorage.setItem('confluence:offline-save-queue:v1', '[1,2,3]')
    expect(readQueue()).toEqual({})
  })

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    expect(() => enqueueSave(base)).not.toThrow()
  })
})

describe('isOfflineError', () => {
  it('treats navigator.onLine === false as offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(isOfflineError(new Error('anything'))).toBe(true)
  })

  it('recognises transport failures', () => {
    expect(isOfflineError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isOfflineError(new Error('NetworkError when attempting to fetch resource'))).toBe(true)
  })

  it('recognises 5xx and status 0', () => {
    expect(isOfflineError({ status: 0, message: '' })).toBe(true)
    expect(isOfflineError({ status: 503, message: '' })).toBe(true)
  })

  it('does NOT treat an authorisation error as offline', () => {
    expect(isOfflineError({ status: 403, message: 'permission denied' })).toBe(false)
    expect(isOfflineError({ message: 'new row violates row-level security policy' })).toBe(false)
  })

  it('does not treat a conflict as offline', () => {
    expect(isOfflineError({ message: 'version_conflict' })).toBe(false)
  })
})
