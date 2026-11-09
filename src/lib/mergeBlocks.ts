/**
 * Three-way merge for note blocks.
 *
 * Used when a save hits a version conflict: rather than forcing the user to
 * choose between "lose your work" and "overwrite theirs", we try to combine
 * both edits.
 *
 * Inputs:
 *   base   — the last version both sides agree on (the ancestor)
 *   mine   — the user's local blocks
 *   theirs — the blocks currently stored on the server
 *
 * Strategy:
 *   - If one side is unchanged from base, take the other side (fast path).
 *   - Otherwise align blocks by block id and merge per block:
 *       * both changed the same block differently -> conflict on that block
 *       * one changed it -> take that one
 *       * neither -> keep base
 *   - Blocks present on only one side are appended in a stable order.
 *
 * This is a line/block-level merge, not a CRDT. It resolves the common
 * cases (two people editing different parts of a note) and refuses to
 * guess when both touched the same block.
 */

export interface MergeBlock {
  id?: string
  type: string
  content: string
  metadata?: unknown
}

export interface MergeResult<T extends MergeBlock> {
  /** Merge succeeded with no unresolved conflicts. */
  clean: boolean
  /** The merged block list (only meaningful when clean). */
  merged: T[]
  /** Ids (or indexes) of blocks both sides edited differently. */
  conflicts: string[]
}

function contentKey(b: MergeBlock): string {
  // Compare what the user actually sees. Ignore the transient id AND the block
  // type: the same block can legitimately be typed differently on each side
  // (e.g. "text" vs "paragraph" after normalisation), and treating that as a
  // change would report a false conflict on every block.
  return String(b.content ?? '')
}

function byId(blocks: MergeBlock[]): Map<string, MergeBlock> {
  const m = new Map<string, MergeBlock>()
  for (const b of blocks) {
    if (b.id) m.set(b.id, b)
  }
  return m
}

/**
 * Order the merged blocks: keep `mine`'s order for blocks it knows about,
 * then append anything that only exists on the other side.
 */
function orderBlocks<T extends MergeBlock>(
  primary: MergeBlock[],
  rest: T[],
): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const b of rest) {
    if (b.id) seen.add(b.id)
    out.push(b)
  }
  // Nothing to reorder when there are no ids at all.
  if (seen.size === 0) return out

  const byPrimaryId = new Map<string, T>()
  for (const b of out) if (b.id) byPrimaryId.set(b.id, b)

  const ordered: T[] = []
  const used = new Set<string>()
  for (const p of primary) {
    if (!p.id) continue
    const match = byPrimaryId.get(p.id)
    if (match) {
      ordered.push(match)
      used.add(p.id)
    }
  }
  for (const b of out) {
    if (b.id && !used.has(b.id)) ordered.push(b)
  }
  return ordered
}

export function threeWayMerge<T extends MergeBlock>(
  base: MergeBlock[],
  mine: T[],
  theirs: T[],
): MergeResult<T> {
  const baseKey = base.map(contentKey).join('\u0001')
  const mineKey = mine.map(contentKey).join('\u0001')
  const theirsKey = theirs.map(contentKey).join('\u0001')

  // Fast paths: only one side changed, so take it wholesale.
  if (mineKey === baseKey && theirsKey !== baseKey) {
    return { clean: true, merged: theirs, conflicts: [] }
  }
  if (theirsKey === baseKey && mineKey !== baseKey) {
    return { clean: true, merged: mine, conflicts: [] }
  }
  if (mineKey === theirsKey) {
    return { clean: true, merged: mine, conflicts: [] }
  }

  // Both sides diverged. Merge block by block, matching on id.
  const baseIds = byId(base)
  const mineIds = byId(mine)
  const theirsIds = byId(theirs)

  // If ids are missing we cannot align blocks; fall back to a conservative
  // result: refuse to merge and let the user decide.
  const hasIds = mine.every((b) => b.id) && theirs.every((b) => b.id)

  if (!hasIds) {
    return { clean: false, merged: mine, conflicts: ['*'] }
  }

  const conflicts: string[] = []
  const merged: T[] = []
  const allIds = new Set<string>([
    ...mineIds.keys(),
    ...theirsIds.keys(),
    ...baseIds.keys(),
  ])

  for (const id of allIds) {
    const b = baseIds.get(id)
    const m = mineIds.get(id) as T | undefined
    const t = theirsIds.get(id) as T | undefined

    const bK = b ? contentKey(b) : null
    const mK = m ? contentKey(m) : null
    const tK = t ? contentKey(t) : null

    if (mK === tK) {
      if (m) merged.push(m)
      continue
    }
    if (mK === bK) {
      // I did not change it; take theirs (which did).
      if (t) merged.push(t)
      continue
    }
    if (tK === bK) {
      // They did not change it; take mine.
      if (m) merged.push(m)
      continue
    }
    // Both changed the same block differently. In a note this is a genuine
    // disagreement (e.g. the same sentence edited two ways), so keep mine
    // and report it rather than silently picking a winner.
    if (m) merged.push(m)
    conflicts.push(id)
  }

  const ordered = orderBlocks(mine, merged)
  return { clean: conflicts.length === 0, merged: ordered, conflicts }
}
