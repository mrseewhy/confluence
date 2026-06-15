import { requireSupabase } from '@/lib/supabase'

const BUCKET = 'note-images'
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export type UploadResult =
  | { ok: true; url: string; path: string }
  | { ok: false; error: string }

/**
 * Upload an image file to Supabase Storage under `{userId}/{filename}`.
 * Returns the public URL on success.
 */
export async function uploadImage(
  file: File,
  userId: string,
): Promise<UploadResult> {
  // Validate
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'Only image files are supported.' }
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: 'Image must be under 5 MB.' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const allowed = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
  if (!allowed.includes(ext)) {
    return { ok: false, error: 'Unsupported image format. Use PNG, JPG, GIF, WebP, or SVG.' }
  }

  // Validate userId before building path
  if (!userId) {
    return { ok: false, error: 'User ID is required for upload.' }
  }

  // Generate a unique path: userId/timestamp-random.ext
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  const path = `${userId}/${timestamp}-${random}.${ext}`

  try {
    const supabase = requireSupabase()

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
        contentType: file.type,
      })

    if (error) {
      console.error('[uploadImage] upload error:', error)
      return { ok: false, error: error.message }
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path)

    const url = publicUrlData?.publicUrl ?? ''

    if (!url) {
      return { ok: false, error: 'Failed to generate public URL.' }
    }

    return { ok: true, url, path }
  } catch (err) {
    console.error('[uploadImage] unexpected error:', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Upload failed unexpectedly.',
    }
  }
}
