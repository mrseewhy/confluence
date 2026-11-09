/**
 * Offline save queue.
 *
 * When a save fails because the network is unavailable, the intended
 * payload is written to localStorage and retried automatically once the
 * browser reports it is back online. This is *last-write-wins per note*:
 * only the newest queued payload for a note is kept, which is the right
 * behaviour for an editor (older intermediate states are noise).
 *
 * Deliberately does NOT try to merge with a remote change — that is
 * handled by the conflict detection in useNoteEditor. A queued save that
 * hits a version conflict stops retrying and surfaces the conflict so the
 * user decides, rather than silently clobbering someone else's edit.
 */

const QUEUE_KEY = 'confluence:offline-save-queue:v1'

export interface QueuedSave {
  noteId:      string | null
  slug:        string
  userId:      string
  title:       string
  description: string
  folder_id:   string | null
  visibility:  string
  blocks:      Array<{ type: string; content: string; metadata: unknown }>
  updatedAt:   string | null
  queuedAt:    number
}

type Queue = Record<string, QueuedSave>

/** A stable key so repeated saves to one note replace rather than stack. */
function keyFor(noteId: string | null, slug: string): string {
  return noteId ?? `slug:${slug}`
}

export function readQueue(): Queue {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Queue
  } catch {
    return {}
  }
}

function writeQueue(q: Queue): void {
  try {
    if (Object.keys(q).length === 0) {
      localStorage.removeItem(QUEUE_KEY)
    } else {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
    }
  } catch {
    // Quota or disabled storage: offline support degrades, app still works.
  }
}

export function enqueueSave(entry: Omit<QueuedSave, 'queuedAt'>): void {
  const q = readQueue()
  q[keyFor(entry.noteId, entry.slug)] = { ...entry, queuedAt: Date.now() }
  writeQueue(q)
}

export function dequeueSave(noteId: string | null, slug: string): void {
  const q = readQueue()
  delete q[keyFor(noteId, slug)]
  writeQueue(q)
}

export function hasQueuedSaves(): boolean {
  return Object.keys(readQueue()).length > 0
}

export function queuedCount(): number {
  return Object.keys(readQueue()).length
}

/** Do we have a queued save for this note? */
export function isQueued(noteId: string | null, slug: string): boolean {
  return keyFor(noteId, slug) in readQueue()
}

/**
 * Treat a failure as "offline" only when the browser says so or the error
 * looks like a transport failure. A plain HTTP/RLS error must not be
 * retried forever.
 */
export function isOfflineError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const e = err as { message?: string; name?: string; status?: number } | null
  if (!e) return false
  if (typeof e.status === 'number') return e.status === 0 || e.status >= 500
  const msg = (e.message ?? '').toLowerCase()
  return (
    e.name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('fetch failed')
  )
}
