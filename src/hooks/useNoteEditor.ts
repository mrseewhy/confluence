import { useState, useCallback, useMemo } from 'react'
import type { BlockType, BlockMetadata, Visibility } from '@/types'

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
}

// ── useNoteEditor ─────────────────────────────────────────────

export function useNoteEditor() {
  const [state, setState] = useState<EditorState>({
    title:       '',
    description: '',
    slug:        '',
    folder_id:   'general',
    visibility:  'public',
    blocks:      [],
  })

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

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

  // ── Save (stub — will wire to Supabase later) ───────────────

  const save = useCallback(async (asDraft = false) => {
    setSaveStatus('saving')
    try {
      // TODO: replace with Supabase insert/upsert
      await new Promise<void>(resolve => setTimeout(resolve, 600))
      console.log('[useNoteEditor] save()', { asDraft, state })
      setSaveStatus('saved')

      // Reset to idle after 2 s
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('[useNoteEditor] save error', err)
      setSaveStatus('error')
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
  }
}
