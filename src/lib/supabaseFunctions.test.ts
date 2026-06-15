import { describe, it, expect } from 'vitest'

// ── Extracted logic from supabase/functions/send-collaborator-invite/index.ts ──

/**
 * Validate the invite payload body.
 * Returns an error message string if invalid, or null if valid.
 */
function validateInvitePayload(body: Record<string, unknown>): string | null {
  const { invitee_email, item_title, owner_username } = body

  if (!invitee_email || !item_title || !owner_username) {
    return 'Missing required fields'
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(String(invitee_email))) {
    return 'Invalid email format'
  }

  return null
}

/**
 * Build the share URL for a note or folder.
 */
function buildShareUrl(
  ownerUsername: string,
  itemType: string,
  itemSlug: string,
  siteUrl?: string,
): string {
  const base = siteUrl || 'http://localhost:3000'
  const path = itemType === 'folder' ? 'folder' : 'n'
  return `${base}/${ownerUsername}/${path}/${itemSlug}`
}

/**
 * In-memory rate limiter — tracks requests per IP within a time window.
 * Returns the remaining requests after this check (0 means blocked).
 */
function createMemoryRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, { count: number; windowStart: number }>()

  function check(ip: string): { allowed: boolean; remaining: number; resetAfterMs: number } {
    const now = Date.now()
    const entry = store.get(ip)

    if (!entry || now - entry.windowStart >= windowMs) {
      // First request or window expired — reset
      store.set(ip, { count: 1, windowStart: now })
      return { allowed: true, remaining: maxRequests - 1, resetAfterMs: windowMs }
    }

    const newCount = entry.count + 1
    if (newCount > maxRequests) {
      const elapsed = now - entry.windowStart
      return { allowed: false, remaining: 0, resetAfterMs: Math.max(0, windowMs - elapsed) }
    }

    store.set(ip, { ...entry, count: newCount })
    return { allowed: true, remaining: maxRequests - newCount, resetAfterMs: windowMs - (now - entry.windowStart) }
  }

  function clear() {
    store.clear()
  }

  return { check, clear }
}

// ── Tests: validateInvitePayload ──────────────────────────────

describe('validateInvitePayload', () => {
  it('returns null for a valid payload', () => {
    const result = validateInvitePayload({
      invitee_email: 'test@example.com',
      item_title: 'My Note',
      owner_username: 'johndoe',
    })
    expect(result).toBeNull()
  })

  it('rejects missing invitee_email', () => {
    const result = validateInvitePayload({
      invitee_email: '',
      item_title: 'My Note',
      owner_username: 'johndoe',
    })
    expect(result).toBe('Missing required fields')
  })

  it('rejects missing item_title', () => {
    const result = validateInvitePayload({
      invitee_email: 'test@example.com',
      item_title: '',
      owner_username: 'johndoe',
    })
    expect(result).toBe('Missing required fields')
  })

  it('rejects missing owner_username', () => {
    const result = validateInvitePayload({
      invitee_email: 'test@example.com',
      item_title: 'My Note',
      owner_username: '',
    })
    expect(result).toBe('Missing required fields')
  })

  it('rejects empty object', () => {
    expect(validateInvitePayload({})).toBe('Missing required fields')
  })

  it('rejects invalid email format (no @)', () => {
    const result = validateInvitePayload({
      invitee_email: 'notanemail',
      item_title: 'My Note',
      owner_username: 'johndoe',
    })
    expect(result).toBe('Invalid email format')
  })

  it('rejects invalid email format (no domain)', () => {
    const result = validateInvitePayload({
      invitee_email: 'user@',
      item_title: 'My Note',
      owner_username: 'johndoe',
    })
    expect(result).toBe('Invalid email format')
  })

  it('rejects invalid email format (no TLD)', () => {
    const result = validateInvitePayload({
      invitee_email: 'user@domain',
      item_title: 'My Note',
      owner_username: 'johndoe',
    })
    expect(result).toBe('Invalid email format')
  })

  it('accepts email with subdomain', () => {
    const result = validateInvitePayload({
      invitee_email: 'user@sub.example.com',
      item_title: 'My Note',
      owner_username: 'johndoe',
    })
    expect(result).toBeNull()
  })

  it('accepts email with plus sign', () => {
    const result = validateInvitePayload({
      invitee_email: 'user+tag@example.com',
      item_title: 'My Note',
      owner_username: 'johndoe',
    })
    expect(result).toBeNull()
  })
})

// ── Tests: buildShareUrl ──────────────────────────────────────

describe('buildShareUrl', () => {
  it('builds a note URL by default', () => {
    const url = buildShareUrl('johndoe', 'note', 'my-note')
    expect(url).toBe('http://localhost:3000/johndoe/n/my-note')
  })

  it('builds a folder URL for folder type', () => {
    const url = buildShareUrl('johndoe', 'folder', 'my-folder')
    expect(url).toBe('http://localhost:3000/johndoe/folder/my-folder')
  })

  it('uses custom SITE_URL when provided', () => {
    const url = buildShareUrl('johndoe', 'note', 'my-note', 'https://confluence.app')
    expect(url).toBe('https://confluence.app/johndoe/n/my-note')
  })

  it('handles slugs with special characters', () => {
    const url = buildShareUrl('admin', 'note', 'hello-world-123')
    expect(url).toBe('http://localhost:3000/admin/n/hello-world-123')
  })

  it('handles empty slug', () => {
    const url = buildShareUrl('johndoe', 'note', '')
    expect(url).toBe('http://localhost:3000/johndoe/n/')
  })
})

// ── Tests: createMemoryRateLimiter ────────────────────────────

describe('createMemoryRateLimiter', () => {
  it('allows first request from an IP', () => {
    const limiter = createMemoryRateLimiter(10, 60000)
    const result = limiter.check('1.2.3.4')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9)
  })

  it('allows requests within the limit', () => {
    const limiter = createMemoryRateLimiter(3, 60000)

    expect(limiter.check('1.2.3.4').allowed).toBe(true)
    expect(limiter.check('1.2.3.4').allowed).toBe(true)
    expect(limiter.check('1.2.3.4').allowed).toBe(true)

    // 4th request should be blocked
    const result = limiter.check('1.2.3.4')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('counts different IPs independently', () => {
    const limiter = createMemoryRateLimiter(2, 60000)

    expect(limiter.check('1.2.3.4').allowed).toBe(true)
    expect(limiter.check('1.2.3.4').allowed).toBe(true)
    expect(limiter.check('1.2.3.4').allowed).toBe(false) // blocked

    // Different IP should still be allowed
    expect(limiter.check('5.6.7.8').allowed).toBe(true)
    expect(limiter.check('5.6.7.8').remaining).toBe(0) // only 1 remaining after first
  })

  it('returns resetAfterMs when blocked', () => {
    const limiter = createMemoryRateLimiter(1, 60000)

    limiter.check('1.2.3.4') // first request
    const result = limiter.check('1.2.3.4') // blocked

    expect(result.allowed).toBe(false)
    expect(result.resetAfterMs).toBeGreaterThan(0)
    expect(result.resetAfterMs).toBeLessThanOrEqual(60000)
  })

  it('resets after the window expires', () => {
    const limiter = createMemoryRateLimiter(1, 50) // 50ms window

    limiter.check('1.2.3.4') // first request
    expect(limiter.check('1.2.3.4').allowed).toBe(false) // blocked within window

    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = limiter.check('1.2.3.4')
        expect(result.allowed).toBe(true) // window expired, reset
        expect(result.remaining).toBe(0) // only 1 allowed per window
        resolve()
      }, 100)
    })
  })

  it('clear() resets all IPs', () => {
    const limiter = createMemoryRateLimiter(1, 60000)

    limiter.check('1.2.3.4')
    expect(limiter.check('1.2.3.4').allowed).toBe(false) // blocked

    limiter.clear()

    // Should be allowed again after clear
    expect(limiter.check('1.2.3.4').allowed).toBe(true)
  })

  it('handles high traffic without errors', () => {
    const limiter = createMemoryRateLimiter(100, 60000)

    // 100 rapid requests from the same IP
    for (let i = 0; i < 100; i++) {
      expect(limiter.check('1.2.3.4').allowed).toBe(true)
    }

    // 101st should be blocked
    expect(limiter.check('1.2.3.4').allowed).toBe(false)
  })

  it('tracks remaining count correctly', () => {
    const limiter = createMemoryRateLimiter(5, 60000)

    expect(limiter.check('1.2.3.4').remaining).toBe(4)
    expect(limiter.check('1.2.3.4').remaining).toBe(3)
    expect(limiter.check('1.2.3.4').remaining).toBe(2)
    expect(limiter.check('1.2.3.4').remaining).toBe(1)
    expect(limiter.check('1.2.3.4').remaining).toBe(0) // last allowed
    expect(limiter.check('1.2.3.4').remaining).toBe(0) // blocked
  })
})
