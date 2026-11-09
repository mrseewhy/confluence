import { useEffect, useState } from 'react'
import { resolveNoteImageUrl, NOTE_MEDIA_PREFIX } from '@/lib/noteMedia'

interface NoteImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  content: string
}

export function NoteImage({ content, alt = '', ...props }: NoteImageProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      try {
        const next = await resolveNoteImageUrl(content)
        if (!cancelled) setUrl(next)
      } catch {
        if (!cancelled) setUrl(null)
      }
      if (!cancelled && content.startsWith(NOTE_MEDIA_PREFIX)) {
        timer = setTimeout(() => { void load() }, 240_000)
      }
    }
    void load()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [content])

  return url ? <img {...props} src={url} alt={alt} /> : null
}
