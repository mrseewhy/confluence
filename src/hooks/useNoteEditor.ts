import { useState, useCallback, useMemo } from 'react'
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

let _idCounter = 0
function nextId(): string {
  _idCounter += 1
  return `block-${Date.now()}-${_idCounter}`
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

// ── useNoteEditor ─────────────────────────────────────────────

export function useNoteEditor() {
  const [state, setState] = useState<EditorState>({
    noteId:      null,
    title:       '',
    description: '',
    slug:        '',
    folder_id:   '',
    visibility:  'public',
    blocks:      [],
  })

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Metadata setters ────────────────────────────────────────

  const setTitle = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      title: value,
      slug:  slugManuallyEdited ? prev.slug : slugify(value),
    }))
  }, [slugManuallyEdited])

  const setSlug = useCallback((value: string) => {
    setSlugManuallyEdited(true)
    setSaveError(null)
    setState(prev => ({ ...prev, slug: value }))
  }, [])

  const setDescription = useCallback((value: string) => {
    setState(prev => ({ ...prev, description: value }))
  }, [])

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
  }, [])

  const updateBlock = useCallback((id: string, content: string) => {
    setState(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === id ? { ...b, content } : b),
    }))
  }, [])

  const updateBlockMeta = useCallback((id: string, meta: Partial<BlockMetadata>) => {
    setState(prev => ({
      ...prev,
      blocks: prev.blocks.map(b =>
        b.id === id ? { ...b, metadata: { ...b.metadata, ...meta } } : b
      ),
    }))
  }, [])

  const removeBlock = useCallback((id: string) => {
    setState(prev => {
      const next = prev.blocks
        .filter(b => b.id !== id)
        .map((b, i) => ({ ...b, order_index: i }))
      return { ...prev, blocks: next }
    })
  }, [])

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
  }, [])

  // ── Load existing note into editor ───────────────────────────

  const loadFromExisting = useCallback(
    (
      note: { id: string; title: string; description: string | null; slug: string; folder_id: string; visibility: string },
      blocks: { id: string; type: string; content: string; metadata: Record<string, unknown> | null }[],
    ) => {
      setSlugManuallyEdited(true)
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

  // ── Reset editor to blank state ─────────────────────────────

  const resetEditor = useCallback(() => {
    setSlugManuallyEdited(false)
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

  const save = useCallback(async (userId: string) => {
    if (!userId) {
      setSaveStatus('error')
      return
    }

    setSaveStatus('saving')
    setSaveError(null)

    const slug = state.slug || slugify(state.title)

    try {
      const supabase = requireSupabase()

      if (state.noteId) {
        // ── UPDATE existing note ──
        const { error: noteError } = await supabase
          .from('notes')
          .update({
            folder_id:   state.folder_id,
            title:       state.title.trim(),
            description: state.description.trim() || null,
            slug,
            visibility:  state.visibility,
          })
          .eq('id', state.noteId)

        if (noteError) throw noteError

        // Replace blocks: delete existing, then insert new
        const { error: deleteError } = await supabase
          .from('note_blocks')
          .delete()
          .eq('note_id', state.noteId)

        if (deleteError) throw deleteError

        if (state.blocks.length > 0) {
          const blocksToInsert = state.blocks.map((block, i) => ({
            note_id:     state.noteId,
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

        setSaveStatus('saved')
        return slug
      } else {
        // ── INSERT new note ──
        const { data: noteData, error: noteError } = await supabase
          .from('notes')
          .insert({
            folder_id:   state.folder_id,
            owner_id:    userId,
            title:       state.title.trim(),
            description: state.description.trim() || null,
            slug,
            visibility:  state.visibility,
          })
          .select('id, slug')
          .single()

        if (noteError) throw noteError
        if (!noteData) throw new Error('Note was not created.')

        // 2. Insert blocks (if any)
        if (state.blocks.length > 0) {
          const blocksToInsert = state.blocks.map((block, i) => ({
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

        setSaveStatus('saved')
        return noteData.slug
      }
    } catch (err) {
      console.error('[useNoteEditor] save error', err)
      setSaveStatus('error')

      // Detect PostgreSQL unique constraint violation (code 23505)
      const pgErr = err as { code?: string; message?: string; details?: string } | null
      if (pgErr?.code === '23505') {
        setSaveError(
          `A note with the slug "${slug}" already exists. Please edit the slug to make it unique.`
        )
      } else {
        setSaveError(pgErr?.message ?? 'An unexpected error occurred while saving.')
      }

      throw err
    }
  }, [state])

  // ── Derived ─────────────────────────────────────────────────

  const isValid = useMemo(
    () => state.title.trim().length > 0 && state.folder_id !== '',
    [state.title, state.folder_id]
  )

  return {
    state,
    saveStatus,
    saveError,
    isValid,
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
    // actions
    save,
    loadFromExisting,
    resetEditor,
  }
}
