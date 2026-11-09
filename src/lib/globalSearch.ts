import { safeStr } from '@/lib/safeParse'

/** Shape returned by the public.global_search RPC. */
export interface SearchHit {
  kind: 'note' | 'folder' | 'person'
  id: string
  title: string
  subtitle: string | null
  slug: string | null
  owner_username: string | null
  updated_at: string | null
}

export const KIND_META: Record<SearchHit['kind'], { icon: string; label: string }> = {
  note: { icon: '📝', label: 'Note' },
  folder: { icon: '📁', label: 'Folder' },
  person: { icon: '👤', label: 'Person' },
}

/** Build the in-app route a result should navigate to.
 *  Falls back to the dashboard when the identifying segment is missing,
 *  rather than emitting a route with an empty segment. */
export function hitHref(hit: SearchHit): string {
  if (hit.kind === 'person') {
    const name = hit.owner_username || hit.slug
    return name ? `/${name}` : '/dashboard'
  }
  const owner = hit.owner_username
  const slug = hit.slug
  if (!owner || !slug) return '/dashboard'
  return hit.kind === 'folder' ? `/${owner}/folder/${slug}` : `/${owner}/n/${slug}`
}

/** Normalise raw RPC rows into typed SearchHit values. */
export function normaliseHits(rows: unknown): SearchHit[] {
  if (!Array.isArray(rows)) return []
  return rows.map((r: Record<string, unknown>) => ({
    kind: safeStr(r.kind, 'note') as SearchHit['kind'],
    id: safeStr(r.id),
    title: safeStr(r.title, 'Untitled'),
    subtitle: r.subtitle ? safeStr(r.subtitle) : null,
    slug: r.slug ? safeStr(r.slug) : null,
    owner_username: r.owner_username ? safeStr(r.owner_username) : null,
    updated_at: r.updated_at ? safeStr(r.updated_at) : null,
  }))
}
