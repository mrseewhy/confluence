// ============================================================
// CONFLUENCE — Core Types
// ============================================================

export type Visibility = 'public' | 'private'
export type BlockType  = 'text' | 'code' | 'image' | 'video'

// ── Role ─────────────────────────────────────────────────────
// Default: 'user'. Promote to admin directly in Supabase:
//   UPDATE profiles SET user_type = 'admin' WHERE id = '<your-id>';

export type UserType = 'user' | 'admin'

// ── Profile ──────────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  user_type: UserType
  created_at: string
}

// ── Folder ───────────────────────────────────────────────────
// parent_id = null  → root folder
// parent_id = <id>  → subfolder

export interface Folder {
  id: string
  owner_id: string
  parent_id: string | null
  title: string
  description: string | null
  slug: string
  visibility: Visibility
  created_at: string
  updated_at: string
  note_count?: number
  subfolders?: Folder[]
}

// ── Note ─────────────────────────────────────────────────────

export interface Note {
  id: string
  folder_id: string
  owner_id: string
  title: string
  description: string | null
  slug: string
  visibility: Visibility
  created_at: string
  updated_at: string
  blocks?: NoteBlock[]
  folder?: Pick<Folder, 'id' | 'title' | 'slug'>
}

// ── Note Block ───────────────────────────────────────────────

export interface NoteBlock {
  id: string
  note_id: string
  type: BlockType
  content: string
  order_index: number
  metadata: BlockMetadata
  created_at: string
}

export interface BlockMetadata {
  language?: string
  alt?: string
  caption?: string
  filename?: string
}
