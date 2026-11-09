import { useEffect, useMemo, useState } from 'react'
import { requireSupabase } from '@/lib/supabase'
import { useAuth } from '@/context/auth'
import { useToast } from '@/components/Toast'
import { Avatar } from '@/components/Avatar'
import { timeAgo } from '@/lib/helpers'
import type { NoteComment } from '@/types'

interface CommentsPanelProps {
  noteId: string
  noteOwnerId: string
}

const MAX_LENGTH = 5000

interface CommentNode extends NoteComment {
  replies: CommentNode[]
}

/** Build a parent→children tree from a flat comment list, newest roots first. */
function buildTree(comments: NoteComment[]): CommentNode[] {
  const byId = new Map<string, CommentNode>()
  for (const c of comments) byId.set(c.id, { ...c, replies: [] })
  const roots: CommentNode[] = []
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.replies.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortDesc = (a: NoteComment, b: NoteComment) => b.created_at.localeCompare(a.created_at)
  roots.sort(sortDesc)
  for (const node of byId.values()) node.replies.sort(sortDesc)
  return roots
}

/**
 * Threaded comments for a note. Any user who can read the note may post;
 * authors, the note owner, and admins may delete.
 */
export function CommentsPanel({ noteId, noteOwnerId }: CommentsPanelProps) {
  const { user, profile } = useAuth()
  const { addToast } = useToast()
  const [comments, setComments] = useState<NoteComment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')

  const isAdmin = profile?.user_type === 'admin'
  const canModerate = user?.id === noteOwnerId || isAdmin

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const supabase = requireSupabase()
        const { data, error } = await supabase
          .from('note_comments')
          .select('id, note_id, author_id, parent_id, body, created_at, updated_at')
          .eq('note_id', noteId)
          .order('created_at', { ascending: true })
        if (error) throw error
        const rows = (data as NoteComment[]) ?? []
        const authorIds = [...new Set(rows.map((r) => r.author_id))]
        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('public_profiles')
            .select('id, full_name, username, avatar_url')
            .in('id', authorIds)
          const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
          for (const row of rows) {
            const p = byId.get(row.author_id)
            row.author = p
              ? { id: p.id, full_name: p.full_name, username: p.username, avatar_url: p.avatar_url }
              : null
          }
        }
        if (!cancelled) setComments(rows)
      } catch {
        if (!cancelled) addToast('Could not load comments', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [noteId, addToast])

  const tree = useMemo(() => buildTree(comments), [comments])

  const submit = async (text: string, parentId: string | null) => {
    if (!user) {
      addToast('Sign in to comment', 'error')
      return
    }
    const trimmed = text.trim()
    if (!trimmed) return
    if (trimmed.length > MAX_LENGTH) {
      addToast(`Comment must be under ${MAX_LENGTH} characters`, 'error')
      return
    }
    setSubmitting(true)
    try {
      const supabase = requireSupabase()
      const { data, error } = await supabase
        .from('note_comments')
        .insert({ note_id: noteId, author_id: user.id, parent_id: parentId, body: trimmed })
        .select('id, note_id, author_id, parent_id, body, created_at, updated_at')
        .single()
      if (error) throw error
      setComments((prev) => [...prev, data as NoteComment])
      if (parentId) {
        setReplyBody('')
        setReplyTo(null)
      } else {
        setBody('')
      }
      addToast('Comment posted', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Could not post comment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: string) => {
    try {
      const supabase = requireSupabase()
      const { error } = await supabase.from('note_comments').delete().eq('id', id)
      if (error) throw error
      // Remove the comment and any children referencing it.
      setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id))
    } catch {
      addToast('Could not delete comment', 'error')
    }
  }

  const canDelete = (c: NoteComment) => user?.id === c.author_id || canModerate

  const renderComment = (c: CommentNode, depth: number) => {
    const name = c.author?.full_name || c.author?.username || 'User'
    return (
      <li key={c.id} style={{ listStyle: 'none', marginLeft: depth > 0 ? 'var(--space-6)' : 0 }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3) 0' }}>
          <Avatar name={name} size={depth > 0 ? 24 : 30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>{name}</span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{timeAgo(c.created_at)}</span>
            </div>
            <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-size-sm)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {c.body}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-1)' }}>
              {user && (
                <button
                  type="button"
                  onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyBody('') }}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}
                >
                  Reply
                </button>
              )}
              {canDelete(c) && (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-danger, #c0392b)', fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}
                >
                  Delete
                </button>
              )}
            </div>

            {replyTo === c.id && (
              <div style={{ marginTop: 'var(--space-2)' }}>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Write a reply…"
                  rows={2}
                  maxLength={MAX_LENGTH}
                  aria-label="Reply"
                  style={{ width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', font: 'inherit', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <button
                    type="button"
                    disabled={submitting || !replyBody.trim()}
                    onClick={() => submit(replyBody, c.id)}
                    style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-accent, #0d7f66)', color: '#fff', cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => { setReplyTo(null); setReplyBody('') }}
                    style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: 'var(--font-size-xs)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {c.replies.length > 0 && (
          <ul style={{ padding: 0, margin: 0 }}>
            {c.replies.map((r) => renderComment(r, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <section
      aria-label="Comments"
      style={{
        marginTop: 'var(--space-9, var(--space-8))',
        paddingTop: 'var(--space-6)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', margin: '0 0 var(--space-4)' }}>
        Comments {comments.length > 0 && <span style={{ color: 'var(--color-text-muted)' }}>({comments.length})</span>}
      </h2>

      {user ? (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            maxLength={MAX_LENGTH}
            aria-label="Add a comment"
            style={{ width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', font: 'inherit', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{body.length}/{MAX_LENGTH}</span>
            <button
              type="button"
              disabled={submitting || !body.trim()}
              onClick={() => submit(body, null)}
              style={{ padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-accent, #0d7f66)', color: '#fff', cursor: submitting || !body.trim() ? 'not-allowed' : 'pointer', opacity: submitting || !body.trim() ? 0.6 : 1, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              {submitting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
          Sign in to join the discussion.
        </p>
      )}

      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Loading comments…</p>
      ) : tree.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>No comments yet.</p>
      ) : (
        <ul style={{ padding: 0, margin: 0 }}>{tree.map((c) => renderComment(c, 0))}</ul>
      )}
    </section>
  )
}
