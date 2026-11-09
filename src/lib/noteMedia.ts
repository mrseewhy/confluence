import { requireSupabase } from '@/lib/supabase'
import { sanitizeImageUrl } from '@/lib/helpers'

export const NOTE_MEDIA_PREFIX = 'storage://note-media/'

export async function uploadNoteImage(file: File, userId: string): Promise<string> {
  if (!userId) throw new Error('Sign in to upload images.')
  if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
    throw new Error('Use a PNG, JPEG, GIF, or WebP image.')
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB.')
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await requireSupabase().storage.from('note-media').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  return NOTE_MEDIA_PREFIX + path
}

export async function resolveNoteImageUrl(content: string): Promise<string | null> {
  if (!content.startsWith(NOTE_MEDIA_PREFIX)) return sanitizeImageUrl(content)
  const path = content.slice(NOTE_MEDIA_PREFIX.length)
  if (!path || path.includes('..')) return null
  const { data, error } = await requireSupabase().storage.from('note-media').createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}
