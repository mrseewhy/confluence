import { describe, it, expect } from 'vitest'
import { buildExport, noteToMarkdown, noteToHtml, noteToJson } from './exportNote'
import type { Note, NoteBlock } from '@/types'

const note: Note = {
  id: 'n1',
  folder_id: 'f1',
  owner_id: 'u1',
  title: 'My Great Note!',
  description: 'A short summary',
  slug: 'my-great-note',
  visibility: 'public',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

function block(partial: Partial<NoteBlock> & Pick<NoteBlock, 'type' | 'content' | 'order_index'>): NoteBlock {
  return {
    id: `b-${partial.order_index}`,
    note_id: 'n1',
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    ...partial,
  } as NoteBlock
}

describe('noteToMarkdown', () => {
  it('renders title, description, and blocks in order', () => {
    const md = noteToMarkdown(note, [
      block({ type: 'text', content: 'Hello world', order_index: 1 }),
      block({ type: 'heading', content: 'Section', order_index: 0, metadata: { level: 'h2' } }),
    ])
    expect(md).toContain('# My Great Note!')
    expect(md).toContain('_A short summary_')
    expect(md).toContain('## Section')
    expect(md).toContain('Hello world')
    // heading (order 0) must come before text (order 1)
    expect(md.indexOf('## Section')).toBeLessThan(md.indexOf('Hello world'))
  })

  it('renders code blocks with language fences', () => {
    const md = noteToMarkdown(note, [block({ type: 'code', content: 'const x = 1', order_index: 0, metadata: { language: 'ts' } })])
    expect(md).toContain('```ts')
    expect(md).toContain('const x = 1')
    expect(md).toContain('```')
  })

  it('renders images with alt text and caption', () => {
    const md = noteToMarkdown(note, [
      block({ type: 'image', content: 'https://x/img.png', order_index: 0, metadata: { alt: 'chart', caption: 'Fig 1' } }),
    ])
    expect(md).toContain('![chart](https://x/img.png)')
    expect(md).toContain('*Fig 1*')
  })
})

describe('noteToHtml', () => {
  it('produces a full document with escaped content', () => {
    const html = noteToHtml(note, [block({ type: 'text', content: '<script>alert(1)</script>', order_index: 0 })])
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<h1>My Great Note!</h1>')
    // user content must be escaped, never raw
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes the title in <title>', () => {
    const html = noteToHtml({ ...note, title: 'A & B <x>' }, [])
    expect(html).toContain('<title>A &amp; B &lt;x&gt;</title>')
  })

  it('preserves newlines in text blocks as <br />', () => {
    const html = noteToHtml(note, [block({ type: 'text', content: 'line1\nline2', order_index: 0 })])
    expect(html).toContain('line1<br />line2')
  })
})

describe('noteToJson', () => {
  it('serializes note metadata and ordered blocks', () => {
    const json = JSON.parse(noteToJson(note, [
      block({ type: 'text', content: 'b', order_index: 1 }),
      block({ type: 'text', content: 'a', order_index: 0 }),
    ]))
    expect(json.title).toBe('My Great Note!')
    expect(json.blocks).toHaveLength(2)
    expect(json.blocks[0].content).toBe('a')
    expect(json.blocks[1].content).toBe('b')
  })
})

describe('buildExport', () => {
  it('builds a markdown payload with a slugified filename', () => {
    const p = buildExport(note, [], 'markdown')
    expect(p.filename).toBe('my-great-note.md')
    expect(p.mimeType).toContain('text/markdown')
  })

  it('builds html and json payloads with correct extensions', () => {
    expect(buildExport(note, [], 'html').filename).toBe('my-great-note.html')
    expect(buildExport(note, [], 'json').filename).toBe('my-great-note.json')
  })

  it('falls back to "untitled" for empty titles', () => {
    expect(buildExport({ ...note, title: '!!!' }, [], 'markdown').filename).toBe('untitled.md')
  })
})
