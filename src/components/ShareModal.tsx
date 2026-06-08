import React, { useState, useEffect, useCallback } from 'react'
import { Button, Input, Badge } from '@/components/ui'
import { requireSupabase } from '@/lib/supabase'

interface Collaborator {
  id: string
  inviter_id: string
  invitee_email: string
  folder_id?: string | null
  note_id?: string | null
  access_level: 'viewer' | 'editor'
  created_at: string
}

const INVITE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-collaborator-invite`;

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: string
  itemTitle: string
  itemType: 'folder' | 'note'
  itemSlug: string
  /** Owner's username — needed to construct the share URL */
  ownerUsername: string
  /** Owner's user ID — needed for Supabase queries */
  ownerId?: string
}

export function ShareModal({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  itemType,
  itemSlug,
  ownerUsername,
  ownerId,
}: ShareModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer')
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')


  // Helper to fetch the inviter's profile fresh (avoids race condition with state)
  const fetchInviterInfo = useCallback(async () => {
    if (!ownerId) return { name: 'Someone', email: '' }
    try {
      const supabase = requireSupabase()
      const [profileRes, userRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', ownerId).single(),
        supabase.auth.getUser(),
      ])
      return {
        name: profileRes.data?.full_name || 'Someone',
        email: userRes.data?.user?.email || '',
      }
    } catch {
      return { name: 'Someone', email: '' }
    }
  }, [ownerId])

  const itemShareUrl = `${window.location.origin}/${ownerUsername}/${itemType === 'folder' ? 'folder' : 'n'}/${itemSlug}`

  const loadCollaborators = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    setError('')
    try {
      const supabase = requireSupabase()
      const filterKey = itemType === 'folder' ? 'folder_id' : 'note_id'
      const { data, error: fetchError } = await supabase
        .from('collaborators')
        .select('*')
        .eq(filterKey, itemId)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      setCollaborators(data || [])

    } catch (err) {
      console.error('Error loading collaborators:', err)
      // If no RLS policy yet or table doesn't exist, silently fall back
      setCollaborators([])
    } finally {
      setLoading(false)
    }
  }, [isOpen, itemId, itemType, fetchInviterInfo])

  useEffect(() => {
    void loadCollaborators()
  }, [loadCollaborators])

  if (!isOpen) return null

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) return

    if (!email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    // Check if already invited (client-side check for instant feedback)
    const exists = collaborators.some(
      c => c.invitee_email.toLowerCase() === email.trim().toLowerCase()
    )
    if (exists) {
      setError('This email has already been invited.')
      return
    }

    setInviting(true)
    try {
      const supabase = requireSupabase()

      const newCollab = {
        inviter_id: ownerId || 'current-user',
        invitee_email: email.trim().toLowerCase(),
        folder_id: itemType === 'folder' ? itemId : null,
        note_id: itemType === 'note' ? itemId : null,
        access_level: role,
      }

      const { data, error: insertError } = await supabase
        .from('collaborators')
        .insert(newCollab)
        .select()
        .single()

      if (insertError) throw insertError

      if (data) {
        setCollaborators(prev => [...prev, data as Collaborator])
      }
      setEmail('')

      // Log invite to activity log
      try {
        await supabase.from('activity_log').insert({
          inviter_id: ownerId || 'current-user',
          invitee_email: email.trim().toLowerCase(),
          action: 'invited',
          folder_id: itemType === 'folder' ? itemId : null,
          note_id: itemType === 'note' ? itemId : null,
          access_level: role,
          item_title: itemTitle,
          item_slug: itemSlug,
          item_type: itemType,
        });
      } catch (logErr) {
        console.error('Failed to log invite:', logErr);
      }

      // Fire-and-forget: send email notification via Edge Function
      // Check if the user has notifications enabled first
      const info = await fetchInviterInfo()
      let shouldSendEmail = true
      try {
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('send_invite_emails')
          .eq('user_id', ownerId)
          .single()
        if (prefs && !prefs.send_invite_emails) {
          shouldSendEmail = false
        }
      } catch {
        // If we can't check, proceed with sending
      }

      if (shouldSendEmail) {
        fetch(INVITE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          inviter_name: info.name,
          inviter_email: info.email,
          invitee_email: email.trim().toLowerCase(),
          item_type: itemType,
          item_title: itemTitle,
          item_slug: itemSlug,
          access_level: role,
          owner_username: ownerUsername,
        }),
      }).catch(err => console.error('Failed to send invite notification:', err));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to invite collaborator.'
      setError(message)
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (collabId: string) => {
    try {
      const supabase = requireSupabase()
      const { error: deleteError } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collabId)

      if (deleteError) throw deleteError

      setCollaborators(prev => prev.filter(c => c.id !== collabId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke access.')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(itemShareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 8, 13, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 300,
          animation: 'fadeIn var(--duration-fast) var(--ease-out)',
        }}
      />

      {/* Modal Dialog */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 301,
        width: '100%',
        maxWidth: '460px',
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-2xl)',
        boxShadow: 'var(--shadow-2xl)',
        overflow: 'hidden',
        animation: 'scaleIn var(--duration-normal) var(--ease-out)',
      }}>
        {/* Header */}
        <div style={{
          padding: 'var(--space-6) var(--space-8)',
          borderBottom: '1px solid var(--color-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
              Share &ldquo;{itemTitle}&rdquo;
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Manage access for this private {itemType}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
          {/* Invite Form */}
          <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Input
                  label="Invite people"
                  placeholder="collaborator@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  error={error}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as 'viewer' | 'editor')}
                  style={{
                    height: '42px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0 var(--space-3)',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              <Button type="submit" variant="primary" style={{ height: '42px' }} disabled={inviting}>
                {inviting ? 'Inviting...' : 'Invite'}
              </Button>
            </div>
          </form>

          {/* Collaborator List */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <p style={{
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              letterSpacing: 'var(--letter-spacing-wider)',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-3)',
            }}>
              Who has access ({loading ? '...' : collaborators.length + 1})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* Owner */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: 'var(--radius-full)',
                    background: 'var(--color-accent-subtle)', color: 'var(--color-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)'
                  }}>
                    O
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                      Owner
                    </p>
                  </div>
                </div>
                <Badge variant="accent">Owner</Badge>
              </div>

              {/* Invited list */}
              {loading && collaborators.length === 0 ? (
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: 'var(--space-4) 0' }}>
                  Loading collaborators...
                </p>
              ) : (
                collaborators.map(c => {
                  const initials = c.invitee_email.slice(0, 2).toUpperCase()
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: 'var(--radius-full)',
                          background: 'var(--color-bg-muted)', color: 'var(--color-text-secondary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)'
                        }}>
                          {initials}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
                            {c.invitee_email}
                          </p>
                          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                            Invited
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Badge variant={c.access_level === 'editor' ? 'success' : 'default'} style={{ textTransform: 'capitalize' }}>
                          {c.access_level}
                        </Badge>
                        <button
                          onClick={() => handleRemove(c.id)}
                          title="Revoke access"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-danger)',
                            fontSize: '12px',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  )
                })
              )}

              {!loading && collaborators.length === 0 && (
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: 'var(--space-4) 0' }}>
                  No guest collaborators yet. Invite someone via email!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer with share link */}
        <div style={{
          padding: 'var(--space-5) var(--space-8)',
          background: 'var(--color-bg-subtle)',
          borderTop: '1px solid var(--color-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}>
          <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-muted)' }}>
            Share Link
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              readOnly
              type="text"
              value={itemShareUrl}
              style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2)',
                outline: 'none',
              }}
            />
            <Button variant="secondary" size="xs" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  )
}
