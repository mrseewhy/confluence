import React, { useState, useEffect } from 'react'
import { Button, Input, Badge } from '@/components/ui'
import { mockCollaborators, type MockCollaborator } from '@/lib/mockData'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: string
  itemTitle: string
  itemType: 'folder' | 'note'
  itemSlug: string
  /** Owner's username — needed to construct the share URL */
  ownerUsername: string
}

export function ShareModal({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  itemType,
  itemSlug,
  ownerUsername,
}: ShareModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer')
  const [collaborators, setCollaborators] = useState<MockCollaborator[]>([])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  // Load collaborators for this item
  useEffect(() => {
    const list = mockCollaborators.filter(c => 
      itemType === 'folder' ? c.folder_id === itemId : c.note_id === itemId
    )
    setCollaborators(list)
  }, [itemId, itemType, isOpen])

  if (!isOpen) return null

  // Correct share URL: /{username}/{type}/{slug}
  const itemShareUrl = `${window.location.origin}/${ownerUsername}/${itemType === 'folder' ? 'folder' : 'n'}/${itemSlug}`

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) return

    // Simple email check
    if (!email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    // Check if already invited
    const exists = mockCollaborators.some(c => 
      (itemType === 'folder' ? c.folder_id === itemId : c.note_id === itemId) &&
      c.invitee_email.toLowerCase() === email.trim().toLowerCase()
    )

    if (exists) {
      setError('This email has already been invited.')
      return
    }

    const newCollab: MockCollaborator = {
      id: `collab-${Date.now()}`,
      inviter_id: 'user-1', // Alex Johnson
      invitee_email: email.trim().toLowerCase(),
      folder_id: itemType === 'folder' ? itemId : null,
      note_id: itemType === 'note' ? itemId : null,
      access_level: role,
      created_at: new Date().toISOString(),
    }

    // Persist into mock store
    mockCollaborators.push(newCollab)
    
    // Update local state
    setCollaborators(prev => [...prev, newCollab])
    setEmail('')
  }

  const handleRemove = (collabId: string) => {
    // Remove from mock store
    const idx = mockCollaborators.findIndex(c => c.id === collabId)
    if (idx !== -1) {
      mockCollaborators.splice(idx, 1)
    }

    // Update local state
    setCollaborators(prev => prev.filter(c => c.id !== collabId))
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
              Share "{itemTitle}"
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
              <Button type="submit" variant="primary" style={{ height: '42px' }}>
                Invite
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
              Who has access
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
                    AJ
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                      Alex Johnson (You)
                    </p>
                    <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      alex@confluence.com
                    </p>
                  </div>
                </div>
                <Badge variant="accent">Owner</Badge>
              </div>

              {/* Invited list */}
              {collaborators.map(c => {
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
              })}

              {collaborators.length === 0 && (
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
