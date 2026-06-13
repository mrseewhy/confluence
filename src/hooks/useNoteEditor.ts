import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { BlockType, BlockMetadata, Visibility } from '@/types'
import { requireSupabase } from '@/lib/supabase'

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

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// ── Helpers ───────────────────────────────────────────────────

function nextId(): string {
  return `block-${crypto.randomUUID()}`
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
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
  stateRef.current = state

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
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
      slug:  slugManuallyEdited ? prev.slug : slugify(value),
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
  }, [])

  const setVisibility = useCallback((value: Visibility) => {
    setState(prev => ({ ...prev, visibility: value }))
  }, [])

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
      note: { id: string; title: string; description: string | null; slug: string; folder_id: string; visibility: string },
      blocks: { id: string; type: string; content: string; metadata: Record<string, unknown> | null }[],
    ) => {
      setSlugManuallyEdited(true)

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
        return
      }

      setState({
        noteId:      note.id,
        title:       note.title,
        description: note.description ?? '',
        slug:        note.slug,
        folder_id:   note.folder_id,
        visibility:  note.visibility as Visibility,
        blocks:      blocks.map((b, i) => ({
          id:          `existing-${b.id}`,
          type:        b.type as BlockType,
          content:     b.content,
          metadata:    (b.metadata ?? {}) as BlockMetadata,
          order_index: i,
        })),
      })
    },
    [],
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
  }, [])

  // ── Save (insert or update note + blocks into Supabase) ─────
  //
  // Reads from the ref instead of the closure—this means the callback
  // is stable and never goes stale. As long as `stateRef.current` is
  // updated on every render (which we do above), it always sees the
  // freshest values.

  const save = useCallback(async (userId: string) => {
    const s = stateRef.current

    if (!userId) {
      setSaveStatus('error')
      return
    }

    setSaveStatus('saving')
    setSaveError(null)

    const slug = s.slug || slugify(s.title)

    try {
      const supabase = requireSupabase()

      if (s.noteId) {
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

        // Replace blocks atomically via stored procedure
        // NOTE: Do NOT JSON.stringify here — supabase-js handles jsonb params automatically
        const { error: rpcError } = await supabase.rpc('replace_note_blocks', {
          p_note_id: s.noteId,
          p_blocks:  s.blocks.map((block, i) => ({
            type:        block.type,
            content:     block.content,
            order_index: i,
            metadata:    block.metadata,
          })),
        })

        if (rpcError) throw rpcError

        clearDraft(s.noteId)
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
        setSaveStatus('saved')
        return noteData.slug
      }
    } catch (err) {
      console.error('[useNoteEditor] save error', err)
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
  }, [])  // stable — always reads latest via stateRef

  // ── Slug availability check (debounced) ─────────────────────
  // Calls the Postgres RPC function is_slug_available to
  // proactively warn the user before they attempt to save.

  const checkSlugAvailability = useCallback((userId: string) => {
    const s = stateRef.current
    const slug = s.slug || slugify(s.title)

    // Don't check empty slugs
    if (!slug) {
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
          p_slug:           slug,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    checkSlugAvailability,
    loadFromExisting,
    resetEditor,
  }
}
