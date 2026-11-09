/**
 * Minimal line-level diff for note version comparison.
 *
 * Notes are block based, so we render each block as text and diff the
 * resulting lines. This is intentionally simple (LCS over lines) — it is
 * for human reading in the version-history modal, not for patching.
 */

export type DiffOp = 'equal' | 'add' | 'remove'

export interface DiffLine {
  op: DiffOp
  text: string
}

export interface BlockLike {
  type?: string
  content?: string | null
  order_index?: number
}

/** Render note blocks into comparable text lines. */
export function blocksToLines(blocks: BlockLike[] | null | undefined): string[] {
  if (!Array.isArray(blocks)) return []
  return blocks
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .flatMap((b) => {
      const raw = (b.content ?? '').toString()
      // Block content may hold markdown/newlines; compare per line.
      const lines = raw.split('\n')
      return b.type && b.type !== 'text' ? [`[${b.type}] ${lines[0] ?? ''}`, ...lines.slice(1)] : lines
    })
}

/**
 * Line diff using a longest-common-subsequence table.
 * Returns ops in display order.
 */
export function diffLines(before: string[], after: string[]): DiffLine[] {
  const n = before.length
  const m = after.length
  // LCS length table (n+1) x (m+1)
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = before[i] === after[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      out.push({ op: 'equal', text: before[i] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ op: 'remove', text: before[i] })
      i++
    } else {
      out.push({ op: 'add', text: after[j] })
      j++
    }
  }
  while (i < n) out.push({ op: 'remove', text: before[i++] })
  while (j < m) out.push({ op: 'add', text: after[j++] })
  return out
}

/** True when the two line sets are identical (no adds or removes). */
export function isUnchanged(diff: DiffLine[]): boolean {
  return diff.every((d) => d.op === 'equal')
}
