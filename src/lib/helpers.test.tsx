import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  formatDate,
  formatDateLong,
  timeAgo,
  buildSlug,
  Avatar,
  buildFolderPath,
  detectVideoProvider,
  getVideoEmbedUrl,
  mapOwner,
  OWNER_QUERY,
} from './helpers'

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    const result = formatDate('2025-06-01T10:00:00Z')
    expect(result).toMatch(/Jun 1, 2025/)
  })
})

describe('formatDateLong', () => {
  it('formats with full month name', () => {
    const result = formatDateLong('2025-06-01T10:00:00Z')
    expect(result).toMatch(/June 1, 2025/)
  })

  it('handles different months', () => {
    expect(formatDateLong('2025-01-15T00:00:00Z')).toMatch(/January 15, 2025/)
    expect(formatDateLong('2025-12-31T00:00:00Z')).toMatch(/December 31, 2025/)
  })
})

describe('timeAgo', () => {
  it('shows minutes for recent dates', () => {
    const recent = new Date(Date.now() - 5 * 60000).toISOString()
    expect(timeAgo(recent)).toMatch(/m ago/)
  })

  it('shows hours for older dates', () => {
    const old = new Date(Date.now() - 3 * 3600000).toISOString()
    expect(timeAgo(old)).toMatch(/h ago/)
  })

  it('shows days for dates days old', () => {
    const daysOld = new Date(Date.now() - 5 * 86400000).toISOString()
    expect(timeAgo(daysOld)).toMatch(/d ago/)
  })

  it('falls back to formatDate for dates over 30 days', () => {
    const veryOld = new Date(Date.now() - 60 * 86400000).toISOString()
    const result = timeAgo(veryOld)
    expect(result).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{4}/)
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

  it('limits to 80 characters', () => {
    const long = 'a'.repeat(100)
    expect(buildSlug(long).length).toBeLessThanOrEqual(80)
  })

  it('replaces spaces and special chars with dashes', () => {
    expect(buildSlug('Hello World! @#$%')).toBe('hello-world')
  })
})

describe('Avatar', () => {
  function renderAvatar(name: string, size?: number, color?: string) {
    return render(<Avatar name={name} size={size} color={color} />).container
  }

  it('renders initials from name', () => {
    const { textContent } = renderAvatar('John Doe')
    expect(textContent).toBe('JD')
  })

  it('renders single initial for one-word name', () => {
    const { textContent } = renderAvatar('Alice')
    expect(textContent).toBe('A')
  })

  it('renders two initials for multi-word name', () => {
    const { textContent } = renderAvatar('Mary Jane Watson')
    expect(textContent).toBe('MJ')
  })

  it('uses custom color when provided', () => {
    const { firstChild } = renderAvatar('Test', undefined, '#ff0000')
    expect(firstChild).toHaveStyle({ background: '#ff0000' })
  })

  it('uses default size 32', () => {
    const { firstChild } = renderAvatar('Test')
    expect(firstChild).toHaveStyle({ width: '32px', height: '32px' })
  })

  it('uses custom size when provided', () => {
    const { firstChild } = renderAvatar('Test', 48)
    expect(firstChild).toHaveStyle({ width: '48px', height: '48px' })
  })
})

describe('buildFolderPath', () => {
  const parentMap = {
    'folder-1': { id: 'folder-1', title: 'Root', slug: 'root', parent_id: null },
    'folder-2': { id: 'folder-2', title: 'Child', slug: 'child', parent_id: 'folder-1' },
    'folder-3': { id: 'folder-3', title: 'Grandchild', slug: 'grandchild', parent_id: 'folder-2' },
  }

  it('returns path with just the folder for root folders', () => {
    const path = buildFolderPath('folder-1', 'Root', 'root', parentMap)
    expect(path).toEqual([{ title: 'Root', slug: 'root' }])
  })

  it('builds path for nested folder', () => {
    const path = buildFolderPath('folder-2', 'Child', 'child', parentMap)
    expect(path).toEqual([
      { title: 'Root', slug: 'root' },
      { title: 'Child', slug: 'child' },
    ])
  })

  it('builds full ancestor chain', () => {
    const path = buildFolderPath('folder-3', 'Grandchild', 'grandchild', parentMap)
    expect(path).toHaveLength(3)
    expect(path[0]).toEqual({ title: 'Root', slug: 'root' })
    expect(path[1]).toEqual({ title: 'Child', slug: 'child' })
    expect(path[2]).toEqual({ title: 'Grandchild', slug: 'grandchild' })
  })

  it('stops at 10 depth to prevent infinite loops', () => {
    const circularMap: Record<string, { id: string; title: string; slug: string; parent_id: string | null }> = {}
    for (let i = 0; i < 15; i++) {
      circularMap[`f-${i}`] = {
        id: `f-${i}`,
        title: `Folder ${i}`,
        slug: `folder-${i}`,
        parent_id: i > 0 ? `f-${i - 1}` : null,
      }
    }
    // buildFolderPath adds the starting folder + up to 10 ancestors (maxDepth 0-9)
    const path = buildFolderPath('f-14', 'Folder 14', 'folder-14', circularMap)
    expect(path.length).toBe(11) // 1 starting folder + 10 ancestors = 11
  })
})

describe('detectVideoProvider', () => {
  it('detects YouTube', () => {
    expect(detectVideoProvider('https://youtube.com/watch?v=abc123')).toBe('youtube')
    expect(detectVideoProvider('https://youtu.be/abc123')).toBe('youtube')
  })

  it('detects Loom', () => {
    expect(detectVideoProvider('https://loom.com/share/abc123')).toBe('loom')
  })

  it('detects Vimeo', () => {
    expect(detectVideoProvider('https://vimeo.com/123456')).toBe('vimeo')
  })

  it('returns null for unknown URLs', () => {
    expect(detectVideoProvider('https://example.com/video')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(detectVideoProvider('')).toBeNull()
  })
})

describe('getVideoEmbedUrl', () => {
  describe('YouTube', () => {
    it('extracts video ID from standard URL', () => {
      const url = getVideoEmbedUrl('https://youtube.com/watch?v=dQw4w9WgXcQ', 'youtube')
      expect(url).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    })

    it('extracts video ID from short URL', () => {
      const url = getVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ', 'youtube')
      expect(url).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    })

    it('ignores query params in short URL', () => {
      const url = getVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=30', 'youtube')
      expect(url).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    })

    it('extracts from embed URL', () => {
      const url = getVideoEmbedUrl('https://youtube.com/embed/dQw4w9WgXcQ', 'youtube')
      expect(url).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    })

    it('returns null for invalid YouTube URL', () => {
      expect(getVideoEmbedUrl('https://youtube.com/', 'youtube')).toBeNull()
    })
  })

  describe('Loom', () => {
    it('extracts video ID from Loom share URL', () => {
      const url = getVideoEmbedUrl('https://loom.com/share/abc123def456', 'loom')
      expect(url).toBe('https://www.loom.com/embed/abc123def456')
    })

    it('returns null for invalid Loom URL', () => {
      expect(getVideoEmbedUrl('https://loom.com/', 'loom')).toBeNull()
    })
  })

  describe('Vimeo', () => {
    it('extracts video ID from Vimeo URL', () => {
      const url = getVideoEmbedUrl('https://vimeo.com/123456789', 'vimeo')
      expect(url).toBe('https://player.vimeo.com/video/123456789')
    })

    it('returns null for invalid Vimeo URL', () => {
      expect(getVideoEmbedUrl('https://vimeo.com/', 'vimeo')).toBeNull()
    })
  })

  it('returns null for unknown provider', () => {
    expect(getVideoEmbedUrl('https://example.com/video', null)).toBeNull()
  })

  it('returns null for malformed URLs', () => {
    expect(getVideoEmbedUrl('not-a-url', 'youtube')).toBeNull()
  })
})

describe('OWNER_QUERY', () => {
  it('returns the correct query fragment', () => {
    expect(OWNER_QUERY).toBe('id, full_name, avatar_url, username')
  })
})

describe('mapOwner', () => {
  it('maps full owner data', () => {
    const owner = { full_name: 'John Doe', avatar_url: 'https://example.com/avatar.jpg', username: 'johndoe' }
    expect(mapOwner(owner, 'Fallback')).toEqual({
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      username: 'johndoe',
    })
  })

  it('falls back to fallbackName when owner is null', () => {
    expect(mapOwner(null, 'Anonymous')).toEqual({
      name: 'Anonymous',
      avatar: null,
      username: null,
    })
  })

  it('handles missing optional fields', () => {
    const owner = { full_name: 'Jane' }
    expect(mapOwner(owner, 'Fallback')).toEqual({
      name: 'Jane',
      avatar: null,
      username: null,
    })
  })
})
