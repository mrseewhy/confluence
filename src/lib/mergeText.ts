/**
 * Character-level three-way merge for a single block's text.
 *
 * `mergeBlocks` combines edits at block granularity. When both people edit the
 * SAME block the block-level merge gave up. This narrows the problem to one
 * string: given the common ancestor and both edited versions, apply the edits
 * that do not overlap and only report a conflict where they genuinely collide.
 *
 * The result is a list of *hunks* so the UI can show exactly which region could
 * not be reconciled instead of discarding everything.
 */

export type SegmentKind = 'clean' | 'conflict'

export interface MergeSegment {
  kind: SegmentKind
  text: string
  /** For conflicts: our version of the disputed region. */
  mine?: string
  /** For conflicts: their version of the disputed region. */
  theirs?: string
  /** For conflicts: the original text, when both sides changed it. */
  base?: string
}

export interface TextMergeResult {
  clean: boolean
  /** Merged text (clean regions + our side of any conflicts). */
  text: string
  segments: MergeSegment[]
}

interface Repl {
  start: number
  end: number
  text: string
}

/**
 * Tokenise into grapheme-ish units. Using code points rather than code units
 * keeps surrogate pairs (emoji) and combining marks from being split.
 */
function tokenize(s: string): string[] {
  return Array.from(s)
}

/**
 * Minimal edit script between two strings (LCS based), returned as a list of
 * replacements expressed in `base` coordinates.
 */
function toReplacements(base: string[], next: string[]): Repl[] {
  const n = base.length
  const m = next.length
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        base[i] === next[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const out: Repl[] = []
  let i = 0
  let j = 0
  let pendingStart: number | null = null
  let pendingEnd = 0
  let pendingText: string[] = []

  const flush = () => {
    if (pendingStart !== null) {
      out.push({ start: pendingStart, end: pendingEnd, text: pendingText.join('') })
      pendingStart = null
      pendingText = []
    }
  }

  while (i < n && j < m) {
    if (base[i] === next[j]) {
      flush()
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      if (pendingStart === null) pendingStart = i
      pendingEnd = i + 1
      i++
    } else {
      if (pendingStart === null) pendingStart = i
      pendingEnd = i
      pendingText.push(next[j])
      j++
    }
  }
  while (i < n) {
    if (pendingStart === null) pendingStart = i
    pendingEnd = i + 1
    i++
  }
  while (j < m) {
    if (pendingStart === null) pendingStart = i
    pendingEnd = i
    pendingText.push(next[j])
    j++
  }
  flush()
  return out
}

/**
 * Do two replacement ranges overlap? Zero-width insertions at the same point
 * with different text also conflict, since their order is ambiguous.
 */
function overlaps(a: Repl, b: Repl): boolean {
  const aEmpty = a.start === a.end
  const bEmpty = b.start === b.end
  if (aEmpty && bEmpty) {
    return a.start === b.start && a.text !== b.text
  }
  if (aEmpty) return a.start > b.start && a.start < b.end
  if (bEmpty) return b.start > a.start && b.start < a.end
  return a.start < b.end && b.start < a.end
}

function sameEdit(a: Repl, b: Repl): boolean {
  return a.start === b.start && a.end === b.end && a.text === b.text
}

/**
 * Merge `mine` and `theirs` against `base`.
 *
 * Non-overlapping edits are both applied, in base order. Where the two edits
 * overlap and are not identical, that region is emitted as a conflict.
 */
export function mergeText(base: string, mine: string, theirs: string): TextMergeResult {
  // Fast paths.
  if (mine === theirs) return { clean: true, text: mine, segments: [{ kind: 'clean', text: mine }] }
  if (mine === base) return { clean: true, text: theirs, segments: [{ kind: 'clean', text: theirs }] }
  if (theirs === base) return { clean: true, text: mine, segments: [{ kind: 'clean', text: mine }] }

  const baseT = tokenize(base)
  const mineR = toReplacements(baseT, tokenize(mine))
  const theirsR = toReplacements(baseT, tokenize(theirs))

  // Pair up edits that touch each other (transitively).
  const used = new Array<boolean>(theirsR.length).fill(false)
  type Hunk = { region: Repl; mineEdits: Repl[]; theirEdits: Repl[]; conflicts: boolean }

  const hunks: Hunk[] = []
  for (const m of mineR) {
    const mine: Repl[] = [m]
    const theirsSide: Repl[] = []
    let conflict = false

    // Grow the hunk while theirs edits interact with what we've collected.
    let changed = true
    while (changed) {
      changed = false
      for (let k = 0; k < theirsR.length; k++) {
        if (used[k]) continue
        const t = theirsR[k]
        if (theirsSide.includes(t)) continue
        if (mine.some((x) => overlaps(x, t)) || theirsSide.some((x) => overlaps(x, t))) {
          theirsSide.push(t)
          if (mine.some((x) => overlaps(x, t) && !sameEdit(x, t))) conflict = true
          changed = true
        }
      }
    }

    if (theirsSide.length === 0) {
      hunks.push({ region: m, mineEdits: [m], theirEdits: [], conflicts: false })
      continue
    }
    theirsSide.forEach((t) => { used[theirsR.indexOf(t)] = true })

    // Region spans everything involved.
    const all = [...mine, ...theirsSide]
    const start = Math.min(...all.map((r) => r.start))
    const end = Math.max(...all.map((r) => r.end))
    hunks.push({ region: { start, end, text: '' }, mineEdits: mine, theirEdits: theirsSide, conflicts: conflict })
  }

  // Theirs-only edits still need applying.
  for (let k = 0; k < theirsR.length; k++) {
    if (used[k]) continue
    const t = theirsR[k]
    hunks.push({ region: t, mineEdits: [], theirEdits: [t], conflicts: false })
  }

  hunks.sort((a, b) => a.region.start - b.region.start || a.region.end - b.region.end)

  // Build output.
  const segments: MergeSegment[] = []
  let cursor = 0
  let clean = true

  const pushClean = (text: string) => {
    if (!text) return
    const last = segments[segments.length - 1]
    if (last && last.kind === 'clean') last.text += text
    else segments.push({ kind: 'clean', text })
  }

  for (const h of hunks) {
    const { start, end } = h.region
    if (start < cursor) {
      // Overlapping hunks already handled; skip rather than duplicate text.
      continue
    }
    pushClean(baseT.slice(cursor, start).join(''))

    if (h.conflicts) {
      clean = false
      // Show the reader whole words rather than just the differing characters.
      const [ws, we] = widenToWords(baseT, start, end)
      const mineText = applyEdits(baseT, h.mineEdits, ws, we)
      const theirsText = applyEdits(baseT, h.theirEdits, ws, we)
      segments.push({
        kind: 'conflict',
        text: mineText,
        mine: mineText,
        theirs: theirsText,
        base: baseT.slice(ws, we).join(''),
      })
      cursor = we
      continue
    } else {
      // Only one side touched this region.
      const edits = h.mineEdits.length ? h.mineEdits : h.theirEdits
      pushClean(applyEdits(baseT, edits, start, end))
    }
    cursor = end
  }
  pushClean(baseT.slice(cursor).join(''))

  return { clean, text: segments.map((s) => s.text).join(''), segments }
}

/**
 * Widen a conflicted region to word boundaries so the user sees whole words
 * ("20" vs "30") instead of only the differing characters ("2" vs "3").
 */
function widenToWords(tokens: string[], start: number, end: number): [number, number] {
  const isWord = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c)
  let s = start
  let e = end
  while (s > 0 && isWord(tokens[s - 1])) s--
  while (e < tokens.length && isWord(tokens[e])) e++
  return [s, e]
}

/** Render one side's edits inside [start, end) against the base tokens. */
function applyEdits(baseT: string[], edits: Repl[], start: number, end: number): string {
  const sorted = [...edits].sort((a, b) => a.start - b.start)
  let out = ''
  let cursor = start
  for (const e of sorted) {
    if (e.start > cursor) out += baseT.slice(cursor, e.start).join('')
    out += e.text
    cursor = Math.max(cursor, e.end)
  }
  if (cursor < end) out += baseT.slice(cursor, end).join('')
  return out
}
