import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { BlockType, BlockMetadata, Visibility } from '@/types'
import { requireSupabase } from '@/lib/supabase'
import { safeVisibility, safeBlockType, safeBlockMetadata } from '@/lib/safeParse'
import { buildSlug } from '@/lib/helpers'
import { enqueueSave, dequeueSave, isOfflineError } from '@/lib/offlineQueue'
import { threeWayMerge, type MergeBlock } from '@/lib/mergeBlocks'

// ── EditorBlock (client-only, not a DB NoteBlock) ─────────────

export interface EditorBlock {
  id:          string
  type:        BlockType
  content:     string
  metadata:    BlockMetadata
  order_index: number
}

// ── EditorState ───────────────────────────────────────────────

interface EditorState {
  noteId:      string | null  // null = creating new, string = editing existing
  title:       string
  description: string
  slug:        string
  folder_id:   string
  visibility:  Visibility
  blocks:      EditorBlock[]
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict' | 'queued'

// ── Helpers ───────────────────────────────────────────────────

function nextId(): string {
  return `block-${crypto.randomUUID()}`
}



const DEFAULT_METADATA: Record<BlockType, BlockMetadata> = {
  text:  {},
  code:  { language: 'javascript' },
  image: {},
  video: {},
  heading: { level: 'h2' },
}

// ── localStorage draft helpers ───────────────────────────────
// Drafts survive accidental navigation/tab-closes so users never
// lose unsaved content. Cleared after a successful manual save.

const DRAFT_PREFIX = 'confluence-draft-'
const DRAFT_SAVE_DELAY = 2000 // 2s debounce before writing to disk

interface DraftData {
  title:       string
  description: string
  slug:        string
  folder_id:   string
  visibility:  Visibility
  /** block content sans ephemeral IDs */
  blocks:      Array<{ type: BlockType; content: string; metadata: BlockMetadata }>
  savedAt:     number
}

function draftKey(noteId: string | null): string {
  return DRAFT_PREFIX + (noteId ?? 'new')
}

function saveDraft(state: EditorState): void {
  try {
    const data: DraftData = {
      title:       state.title,
      description: state.description,
      slug:        state.slug,
      folder_id:   state.folder_id,
      visibility:  state.visibility,
      blocks:      state.blocks.map(b => ({
        type:     b.type,
        content:  b.content,
        metadata: b.metadata,
      })),
      savedAt: Date.now(),
    }
    localStorage.setItem(draftKey(state.noteId), JSON.stringify(data))
  } catch {
    // localStorage can throw (quota exceeded, disabled, etc.) — ignore
  }
}

function loadDraft(noteId: string | null): DraftData | null {
  try {
    const raw = localStorage.getItem(draftKey(noteId))
    if (!raw) return null
    const data = JSON.parse(raw) as DraftData
    return data
  } catch {
    return null
  }
}

function clearDraft(noteId: string | null): void {
  try {
    localStorage.removeItem(draftKey(noteId))
  } catch {
    // ignore
  }
}

/** Returns true when there's a saved draft that could be restored. */
export function hasDraft(noteId: string | null): boolean {
  try {
    return localStorage.getItem(draftKey(noteId)) !== null
  } catch {
    return false
  }
}

// ── useNoteEditor ─────────────────────────────────────────────

export function useNoteEditor() {
  // Try to restore a draft for a new note from localStorage on initial mount.
  // This ensures content survives accidental navigation: if the user left
  // the editor mid-edit and comes back, the draft is restored immediately
  // rather than showing an empty form.
  const [state, setState] = useState<EditorState>(() => {
    const draft = loadDraft(null)
    if (draft) {
      return {
        noteId:      null,
        title:       draft.title,
        description: draft.description,
        slug:        draft.slug,
        folder_id:   draft.folder_id,
        visibility:  draft.visibility,
        blocks:      draft.blocks.map((b, i) => ({
          id:          `draft-${i}`,
          type:        b.type,
          content:     b.content,
          metadata:    b.metadata,
          order_index: i,
        })),
      }
    }
    return {
      noteId:      null,
      title:       '',
      description: '',
      slug:        '',
      folder_id:   '',
      visibility:  'public',
      blocks:      [],
    }
  })

  // Always keep a ref to the latest state so that callbacks
  // (e.g. the save function) never capture stale closures.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  // The updated_at we last saw from the server. Used for optimistic
  // concurrency so a concurrent save is reported instead of clobbered.
  const lastUpdatedAtRef = useRef<string | null>(null)
  // Remembers the user for the offline-flush effect, which must not depend
  // on the save callback identity (it is recreated on every state change).
  const lastUserIdRef = useRef<string | null>(null)
  const baseBlocksRef = useRef<MergeBlock[]>([])
  const saveRef = useRef<((userId: string) => Promise<string | undefined>) | null>(null)
  const [slugAvailable, setSlugAvailable] = useState(true)
  const [slugChecking, setSlugChecking] = useState(false)
  const slugCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Content version counter ─────────────────────────────────
  // Incremented every time user content changes (title, desc,
  // blocks). Auto-save effects can depend on this instead of
  // sprawling object references to avoid re-creating timers on
  // every keystroke.
  const [contentVersion, setContentVersion] = useState(0)
  const bumpVersion = useCallback(() => {
    setContentVersion(v => v + 1)
  }, [])

  // ── Metadata setters ────────────────────────────────────────

  const setTitle = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      title: value,
      slug:  slugManuallyEdited ? prev.slug : buildSlug(value),
    }))
    bumpVersion()
  }, [slugManuallyEdited, bumpVersion])

  const setSlug = useCallback((value: string) => {
    setSlugManuallyEdited(true)
    setSaveError(null)
    setState(prev => ({ ...prev, slug: value }))
  }, [])

  const setDescription = useCallback((value: string) => {
    setState(prev => ({ ...prev, description: value }))
    bumpVersion()
  }, [bumpVersion])

  const setFolderId = useCallback((value: string) => {
    setState(prev => ({ ...prev, folder_id: value }))
    bumpVersion()
  }, [bumpVersion])

  const setVisibility = useCallback((value: Visibility) => {
    setState(prev => ({ ...prev, visibility: value }))
    bumpVersion()
  }, [bumpVersion])

  // ── Block actions ────────────────────────────────────────────

  const addBlock = useCallback((type: BlockType) => {
    setState(prev => {
      const nextIndex = prev.blocks.length
      const block: EditorBlock = {
        id:          nextId(),
        type,
        content:     '',
        metadata:    { ...DEFAULT_METADATA[type] },
        order_index: nextIndex,
      }
      return { ...prev, blocks: [...prev.blocks, block] }
    })
    bumpVersion()
  }, [bumpVersion])

  const updateBlock = useCallback((id: string, content: string) => {
    setState(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === id ? { ...b, content } : b),
    }))
    bumpVersion()
  }, [bumpVersion])

  const updateBlockMeta = useCallback((id: string, meta: Partial<BlockMetadata>) => {
    setState(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.id === id ? { ...b, metadata: { ...b.metadata, ...meta } } : b
      ),
    }))
    bumpVersion()
  }, [bumpVersion])

  const removeBlock = useCallback((id: string) => {
    setState(prev => {
      const next = prev.blocks
        .filter(b => b.id !== id)
        .map((b, i) => ({ ...b, order_index: i }))
      return { ...prev, blocks: next }
    })
    bumpVersion()
  }, [bumpVersion])

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setState(prev => {
      const blocks = [...prev.blocks]
      const idx = blocks.findIndex(b => b.id === id)
      if (idx === -1) return prev

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= blocks.length) return prev

      // Swap
      ;[blocks[idx], blocks[targetIdx]] = [blocks[targetIdx], blocks[idx]]

      // Re-index
      const reindexed = blocks.map((b, i) => ({ ...b, order_index: i }))
      return { ...prev, blocks: reindexed }
    })
    bumpVersion()
  }, [bumpVersion])

  const reorderBlock = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    setState(prev => {
      const blocks = [...prev.blocks]
      const [moved] = blocks.splice(fromIndex, 1)
      blocks.splice(toIndex, 0, moved)
      const reindexed = blocks.map((b, i) => ({ ...b, order_index: i }))
      return { ...prev, blocks: reindexed }
    })
    bumpVersion()
  }, [bumpVersion])

  // ── Load existing note into editor (with optional draft restore) ──
  // If localStorage has a draft for this noteId, it takes precedence
  // because the user likely navigated away with unsaved changes.

  const loadFromExisting = useCallback(
    (
      note: { id: string; title: string; description: string | null; slug: string; folder_id: string; visibility: string; updated_at?: string },
      blocks: { id: string; type: string; content: string; metadata: Record<string, unknown> | null }[],
    ) => {
      setSlugManuallyEdited(true)
      // Remember the server timestamp so saves can detect concurrent edits.
      lastUpdatedAtRef.current = note.updated_at ?? null
      // The blocks as last loaded are the common ancestor for a three-way
      // merge. Captured here, at load time, because by the time a conflict is
      // detected the server copy has already moved on.
      baseBlocksRef.current = blocks.map(b => ({ type: b.type, content: b.content }))

      // Prefer localStorage draft over DB data
      const draft = loadDraft(note.id)
      if (draft) {
        setState({
          noteId:      note.id,
          title:       draft.title,
          description: draft.description,
          slug:        draft.slug,
          folder_id:   draft.folder_id,
          visibility:  draft.visibility,
          blocks:      draft.blocks.map((b, i) => ({
            id:          `existing-draft-${i}`,
            type:        b.type,
            content:     b.content,
            metadata:    b.metadata,
            order_index: i,
          })),
        })
        bumpVersion()
        return
      }

      setState({
        noteId:      note.id,
        title:       note.title,
        description: note.description ?? '',
        slug:        note.slug,
        folder_id:   note.folder_id,
        visibility:  safeVisibility(note.visibility),
        blocks:      blocks.map((b, i) => ({
          id:          `existing-${b.id}`,
          type:        safeBlockType(b.type),
          content:     b.content,
          metadata:    safeBlockMetadata(b.metadata),
          order_index: i,
        })),
      })

      // Bump version so auto-save / beforeunload effects fire
      // even before the user makes their first edit.
      bumpVersion()
    },
    [bumpVersion],
  )

  // ── Reset editor to blank state (with optional draft restore) ──

  const resetEditor = useCallback(() => {
    setSlugManuallyEdited(false)
    setSlugAvailable(true)
    setSlugChecking(false)

    // Restore a saved draft for new notes, if one exists
    const draft = loadDraft(null)
    if (draft) {
      setState({
        noteId:      null,
        title:       draft.title,
        description: draft.description,
        slug:        draft.slug,
        folder_id:   draft.folder_id,
        visibility:  draft.visibility,
        blocks:      draft.blocks.map((b, i) => ({
          id:          `draft-${i}`,
          type:        b.type,
          content:     b.content,
          metadata:    b.metadata,
          order_index: i,
        })),
      })
      return
    }

    setState({
      noteId:      null,
      title:       '',
      description: '',
      slug:        '',
      folder_id:   '',
      visibility:  'public',
      blocks:      [],
    })
    bumpVersion()
  }, [bumpVersion])

  // ── Save a version snapshot before updating ────────────────

  const saveVersion = useCallback(async (noteId: string, userId: string) => {
    try {
      const supabase = requireSupabase()
      await supabase.rpc('save_note_version', {
        p_note_id: noteId,
        p_user_id: userId,
      })
    } catch {
      // Version saving is best-effort — don't block the save
    }
  }, [])

  // ── Save (insert or update note + blocks into Supabase) ─────
  //
  // Reads from the ref instead of the closure—this means the callback
  // is stable and never goes stale. As long as `stateRef.current` is
  // updated on every render (which we do above), it always sees the
  // freshest values.

  const save = useCallback(async (userId: string) => {
    const s = stateRef.current
    lastUserIdRef.current = userId || null

    if (!userId) {
      setSaveStatus('error')
      return
    }

    setSaveStatus('saving')
    setSaveError(null)

    const slug = s.slug || buildSlug(s.title)

    try {
      const supabase = requireSupabase()

      if (s.noteId) {
        // Save a version snapshot before updating (revision history)
        await saveVersion(s.noteId, userId)

        // ── UPDATE existing note ──
        const { error: noteError } = await supabase
          .from('notes')
          .update({
            folder_id:   s.folder_id,
            title:       s.title.trim(),
            description: s.description.trim() || null,
            slug,
            visibility:  s.visibility,
          })
          .eq('id', s.noteId)

        if (noteError) throw noteError

        // Replace blocks atomically via stored procedure.
        // NOTE: Do NOT JSON.stringify here — supabase-js handles jsonb params automatically.
        // Pass the updated_at we last observed so a concurrent save raises
        // version_conflict instead of silently overwriting the other edit.
        const { error: rpcError } = await supabase.rpc('replace_note_blocks_checked', {
          p_note_id: s.noteId,
          p_blocks:  s.blocks.map((block, i) => ({
            type:        block.type,
            content:     block.content,
            order_index: i,
            metadata:    block.metadata,
          })),
          p_expected_updated_at: lastUpdatedAtRef.current,
        })

        if (rpcError) throw rpcError

        // Adopt the server's new timestamp so the next save is in sync.
        // Best effort: a failure here must never fail the save itself.
        try {
          const { data: stamp } = await supabase
            .from('notes')
            .select('updated_at')
            .eq('id', s.noteId)
            .maybeSingle()
          if (stamp?.updated_at) lastUpdatedAtRef.current = stamp.updated_at
        } catch {
          // Ignore: conflict detection degrades to last-write-wins.
        }

        clearDraft(s.noteId)
        dequeueSave(s.noteId, slug)
        setSaveStatus('saved')
        return slug
      } else {
        // ── INSERT new note ──
        const { data: noteData, error: noteError } = await supabase
          .from('notes')
          .insert({
            folder_id:   s.folder_id,
            owner_id:    userId,
            title:       s.title.trim(),
            description: s.description.trim() || null,
            slug,
            visibility:  s.visibility,
          })
          .select('id, slug')
          .single()

        if (noteError) throw noteError
        if (!noteData) throw new Error('Note was not created.')

        // Set noteId in state so subsequent saves (including auto-save) UPDATE instead of INSERT
        // Also update the ref synchronously to prevent race conditions: if auto-save fires
        // before React re-renders, it reads from stateRef which is now up-to-date.
        setState(prev => ({ ...prev, noteId: noteData.id }))
        stateRef.current = { ...stateRef.current, noteId: noteData.id }

        // 2. Insert blocks (if any)
        if (s.blocks.length > 0) {
          const blocksToInsert = s.blocks.map((block, i) => ({
            note_id:     noteData.id,
            type:        block.type,
            content:     block.content,
            order_index: i,
            metadata:    block.metadata,
          }))

          const { error: blocksError } = await supabase
            .from('note_blocks')
            .insert(blocksToInsert)

          if (blocksError) throw blocksError
        }

        clearDraft(null)
        dequeueSave(null, slug)
        setSaveStatus('saved')
        return noteData.slug
      }
    } catch (err) {
      console.error('[useNoteEditor] save error', err)

      // Network gone: keep the work locally and retry when we're back online.
      // Checked before the generic error path so an offline save is never
      // reported as a hard failure.
      if (isOfflineError(err)) {
        enqueueSave({
          noteId:      s.noteId,
          slug,
          userId,
          title:       s.title,
          description: s.description,
          folder_id:   s.folder_id,
          visibility:  s.visibility,
          blocks:      s.blocks.map(b => ({ type: b.type, content: b.content, metadata: b.metadata })),
          updatedAt:   lastUpdatedAtRef.current,
        })
        setSaveStatus('queued')
        setSaveError('You are offline. Your changes are saved on this device and will sync when you reconnect.')
        return
      }

      // A concurrent save moved the note on: report it rather than overwrite.
      const conflictErr = err as { message?: string } | null
      if (typeof conflictErr?.message === 'string' && conflictErr.message.includes('version_conflict')) {
        // Try to combine both edits instead of forcing a choice. The base is
        // the version snapshot taken just before this save; theirs is what is
        // on the server now; mine is what the user has in the editor.
        let mergedCleanly = false
        let mergedForRetry: Array<{ id: string; type: BlockType; content: string; metadata: BlockMetadata; order_index: number }> = []
        try {
          const supabase = requireSupabase()
          const { data: theirsBlocks } = await supabase
            .from('note_blocks')
            .select('type, content, order_index')
            .eq('note_id', s.noteId)
            .order('order_index', { ascending: true })

          const toBlocks = (rows: unknown): MergeBlock[] =>
            Array.isArray(rows)
              ? rows.map((r) => {
                  const row = r as { type?: string; content?: string }
                  return { type: row.type ?? 'paragraph', content: row.content ?? '' }
                })
              : []

          const theirBlocks = toBlocks(theirsBlocks)
          const baseBlocks = baseBlocksRef.current

          const mineWithIds = s.blocks.map((blk) => ({
            id:         blk.id,
            type:       blk.type,
            content:    blk.content,
            metadata:   blk.metadata,
          }))

          // Align by position: note_blocks rows carry no client block id.
          const indexed = (arr: MergeBlock[]) =>
            arr.map((blk, i) => ({ ...blk, id: `p${i}` }))

          const result = threeWayMerge(
            indexed(baseBlocks),
            indexed(mineWithIds) as typeof mineWithIds,
            indexed(theirBlocks),
          )

          if (result.clean) {
            // Adopt the merged content and retry the save immediately.
            mergedForRetry = result.merged.map((blk, i) => ({
              id:        s.blocks[i]?.id ?? nextId(),
              type:      blk.type as BlockType,
              content:   blk.content,
              metadata:  (blk.metadata ?? {}) as BlockMetadata,
              order_index: i,
            }))
            setState((prev) => ({ ...prev, blocks: mergedForRetry }))
            setContentVersion((v) => v + 1)
            mergedCleanly = true
          }
        } catch {
          // Merging is best-effort; fall through to the manual conflict path.
        }

        if (mergedCleanly) {
          // Re-read the server timestamp so the retried save passes the CAS.
          try {
            const supabase = requireSupabase()
            const { data: fresh } = await supabase
              .from('notes')
              .select('updated_at')
              .eq('id', s.noteId)
              .maybeSingle()
            if (fresh?.updated_at) lastUpdatedAtRef.current = fresh.updated_at
          } catch { /* fall through */ }

          // Persist the merge now: setting state alone would leave the note
          // unsaved until some later autosave happened to fire.
          setSaveStatus('saving')
          try {
            const { error: mergedErr } = await requireSupabase().rpc('replace_note_blocks_checked', {
              p_note_id: s.noteId,
              p_blocks:  mergedForRetry.map((blk, i) => ({
                type:       blk.type,
                content:    blk.content,
                order_index: i,
                metadata:   blk.metadata,
              })),
              // Force the write: we have already reconciled both sides.
              p_expected_updated_at: null,
            })
            if (mergedErr) throw mergedErr

            clearDraft(s.noteId)
            dequeueSave(s.noteId, slug)
            setSaveStatus('saved')
            setSaveError('Your changes were merged with the other edit.')
          } catch (e) {
            console.error('[useNoteEditor] merged save failed', e)
            setSaveStatus('conflict')
            setSaveError('Could not save the merged version. Your changes are safe here — please save again.')
          }
          return
        }

        // Could not merge automatically: adopt the server timestamp so a
        // deliberate retry succeeds as an overwrite, then tell the user.
        try {
          const supabase = requireSupabase()
          const { data: fresh } = await supabase
            .from('notes')
            .select('updated_at')
            .eq('id', s.noteId)
            .maybeSingle()
          if (fresh?.updated_at) lastUpdatedAtRef.current = fresh.updated_at
        } catch {
          // If we cannot read it, leave the ref alone; the user is told to reload.
        }

        setSaveStatus('conflict')
        setSaveError('Someone else edited the same part of this note. Your changes are safe here — reload to see their version, or save again to overwrite.')
        return
      }

      setSaveStatus('error')

      // Detect PostgreSQL unique constraint violation (code 23505)
      const pgErr = err as { code?: string; message?: string; details?: string } | null
      if (pgErr?.code === '23505') {
        // Suggest an alternative slug by appending a number
        const suggestion = slug.replace(/-\d+$/, '') + '-' + Date.now().toString(36)
        setState(prev => ({ ...prev, slug: suggestion }))
        setSlugManuallyEdited(true)
        setSaveError(
          `A note with the slug "${slug}" already exists. We've suggested "${suggestion}" — edit or save again to use it.`
        )
      } else {
        setSaveError(pgErr?.message ?? 'An unexpected error occurred while saving.')
      }

      throw err
    }
  }, [saveVersion])  // saveVersion is a stable useCallback

  // Expose the latest save to the offline-flush effect without adding it as a
  // dependency (its identity changes on every state update).
  useEffect(() => {
    saveRef.current = save
  }, [save])

  // ── Slug availability check (debounced) ─────────────────────
  // Calls the Postgres RPC function is_slug_available to
  // proactively warn the user before they attempt to save.

  const checkSlugAvailability = useCallback((userId: string, slug?: string) => {
    // Use the provided slug if given (avoids stale ref timing issues),
    // otherwise fall back to reading from stateRef.current.
    const s = stateRef.current
    const effectiveSlug = slug ?? (s.slug || buildSlug(s.title))

    // Don't check empty slugs
    if (!effectiveSlug) {
      setSlugAvailable(true)
      setSlugChecking(false)
      return
    }

    // Clear previous timer
    if (slugCheckTimerRef.current) {
      clearTimeout(slugCheckTimerRef.current)
    }

    // Debounce: wait 400ms after last change before checking
    slugCheckTimerRef.current = setTimeout(async () => {
      setSlugChecking(true)
      try {
        const supabase = requireSupabase()
        const { data, error } = await supabase.rpc('is_slug_available', {
          p_slug:           effectiveSlug,
          p_owner_id:       userId,
          p_exclude_note_id: s.noteId,
        })
        if (error) throw error
        setSlugAvailable(data ?? true)
      } catch {
        // Silently fall back to available on network errors
        setSlugAvailable(true)
      } finally {
        setSlugChecking(false)
      }
    }, 400)
  }, [])

  // ── Draft state (for restore banner) ────────────────────────

  const draftExists = hasDraft(null)
  const draftTimestamp = (() => {
    if (!draftExists) return null
    const raw = loadDraft(null)
    return raw?.savedAt ?? null
  })()

  const discardDraft = useCallback(() => {
    clearDraft(null)
    setState({
      noteId:      null,
      title:       '',
      description: '',
      slug:        '',
      folder_id:   '',
      visibility:  'public',
      blocks:      [],
    })
    bumpVersion()
  }, [bumpVersion])

  // ── Derived ─────────────────────────────────────────────────

  const isValid = useMemo(
    () => state.title.trim().length > 0 && state.folder_id !== '',
    [state.title, state.folder_id]
  )

  // ── Draft auto-save (debounced to localStorage) ─────────────
  // Persists editor content to localStorage so that accidental
  // navigation, tab closes, or refreshes don't lose unsaved work.
  // Drafts are cleared on successful DB save.
  //
  // The effect:
  //   1. Debounces writes to localStorage (DRAFT_SAVE_DELAY) so we
  //      don't hit disk on every keystroke.
  //   2. On unmount (in-app navigation), **saves immediately** so no
  //      draft is lost if the debounce hasn't fired yet.
  //
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Don't save an empty initial state — that would overwrite an existing draft!
    if (contentVersion === 0) return

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)

    draftTimerRef.current = setTimeout(() => {
      saveDraft(stateRef.current)
    }, DRAFT_SAVE_DELAY)

    return () => {
      // Unmount-safety: save the latest state immediately so the
      // draft survives in-app navigation even if the debounce timer
      // hasn't elapsed yet.
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current)
      }
      // Write the very latest state to disk right now
      saveDraft(stateRef.current)
    }
    // Re-run on every content change so the timer resets
  }, [contentVersion])

  // ── beforeunload save + warning ─────────────────────────────
  // Two concerns here:
  //   - Save the draft so a tab close / refresh doesn't lose work
  //   - Show a browser confirmation dialog to warn the user

  useEffect(() => {
    if (contentVersion === 0) return

    const handler = (e: BeforeUnloadEvent) => {
      // Save immediately before the page unloads
      saveDraft(stateRef.current)
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [contentVersion])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (slugCheckTimerRef.current) {
        clearTimeout(slugCheckTimerRef.current)
      }
    }
  }, [])

  // ── Merge remote blocks (from Realtime collaboration) ──────
  // Called when another collaborator's auto-save broadcasts their
  // blocks. Intentionally does NOT bump contentVersion — remote
  // updates should not trigger auto-save loops.

  const mergeRemoteBlocks = useCallback(
    (payload: {
      blocks: Array<{ id: string; type: BlockType; content: string; metadata: BlockMetadata; order_index: number }>
      title: string
      description: string
    }) => {
      setState(prev => ({
        ...prev,
        title:     payload.title,
        description: payload.description,
        blocks:    payload.blocks.map((b, i) => ({
          id:          b.id,
          type:        b.type,
          content:     b.content,
          metadata:    b.metadata,
          order_index: i,
        })),
      }))
    },
    [],
  )

  // ── Flush queued offline saves when the connection returns ────
  // Only retries the note currently open in this editor instance; the queue
  // persists across reloads, so a save made offline is never lost even if
  // the user closes the tab before reconnecting.
  useEffect(() => {
    const flush = async () => {
      const { readQueue } = await import('@/lib/offlineQueue')
      const queue = readQueue()
      if (Object.keys(queue).length === 0) return
      if (!lastUserIdRef.current) return

      const s = stateRef.current
      const mine = Object.entries(queue).find(([k]) =>
        s.noteId ? k === s.noteId : k === `slug:${s.slug || buildSlug(s.title)}`,
      )
      if (!mine) return

      // The editor still holds the newest text, so just save it again.
      void saveRef.current?.(lastUserIdRef.current)
    }

    const onOnline = () => { flush().catch(() => {}) }
    window.addEventListener('online', onOnline)
    // Also attempt a flush on mount, in case we are already back online.
    if (typeof navigator === 'undefined' || navigator.onLine) {
      const t = setTimeout(() => { flush().catch(() => {}) }, 1500)
      return () => { clearTimeout(t); window.removeEventListener('online', onOnline) }
    }
    return () => window.removeEventListener('online', onOnline)
  }, [])

  return {
    state,
    saveStatus,
    saveError,
    isValid,
    contentVersion,
    slugAvailable,
    slugChecking,
    // metadata
    setTitle,
    setSlug,
    setDescription,
    setFolderId,
    setVisibility,
    // blocks
    addBlock,
    updateBlock,
    updateBlockMeta,
    removeBlock,
    moveBlock,
    reorderBlock,
    // actions
    save,
    saveVersion,
    checkSlugAvailability,
    loadFromExisting,
    resetEditor,
    // draft
    draftExists,
    draftTimestamp,
    discardDraft,
    // collaboration
    mergeRemoteBlocks,
  }
}
