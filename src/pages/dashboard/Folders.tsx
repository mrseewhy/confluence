import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Icon } from '@/components/layout/DashboardIcon'
import { IC } from '@/components/layout/dashboardIconPaths'
import { Badge, Button, EmptyState, Input } from '@/components/ui'
import { mockCurrentUser, mockFolders } from '@/lib/mockData'
import { ShareModal } from '@/components/ShareModal'
import type { Folder, Visibility } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DashboardFolders() {
  const user = mockCurrentUser
  const [foldersList, setFoldersList] = useState<Folder[]>(mockFolders)
  const [search, setSearch] = useState('')
  const [vis, setVis] = useState<'all' | 'public' | 'private'>('all')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  
  // Share Modal State
  const [shareItem, setShareItem] = useState<Folder | null>(null)

  // Create Folder State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newVisibility, setNewVisibility] = useState<Visibility>('public') // notes/folders public by default!

  const rootFolders = foldersList.filter(f => f.parent_id === null)
  const filtered = rootFolders.filter(f => {
    const q = search.toLowerCase()
    return (
      (f.title.toLowerCase().includes(q) || (f.description ?? '').toLowerCase().includes(q)) &&
      (vis === 'all' || f.visibility === vis)
    )
  })

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      owner_id: user.id,
      parent_id: null,
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      slug,
      visibility: newVisibility,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      note_count: 0,
      subfolders: [],
    }

    // Insert at index 1 (right below general folder)
    const list = [...foldersList]
    list.splice(1, 0, newFolder)
    mockFolders.splice(1, 0, newFolder) // sync mock store
    
    setFoldersList(list)
    setIsCreateOpen(false)
    setNewTitle('')
    setNewDesc('')
    setNewVisibility('public')
  }

  const handleDeleteFolder = (id: string) => {
    const list = foldersList.filter(f => f.id !== id)
    setFoldersList(list)
    
    // Sync with mock store
    const idx = mockFolders.findIndex(f => f.id === id)
    if (idx !== -1) mockFolders.splice(idx, 1)

    setConfirmDelete(null)
  }

  return (
    <DashboardLayout user={user} variant="user">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', letterSpacing: 'var(--letter-spacing-tight)', marginBottom: 'var(--space-1)' }}>Folders</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{rootFolders.length} folder{rootFolders.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)} leftIcon={<Icon d={IC.plus} size={14} />}>New folder</Button>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <input
          type="search" placeholder="Search folders…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 220px', fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)', outline: 'none' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-subtle)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {(['all','public','private'] as const).map(v => (
            <Button key={v} variant={vis === v ? 'accent-ghost' : 'secondary'} size="sm" onClick={() => setVis(v)} style={{ textTransform: 'capitalize' }}>{v}</Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          {/* Table head */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px 140px', gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)' }}>
            {['Folder', 'Notes', 'Visibility', 'Updated', 'Actions'].map(h => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{h}</span>
            ))}
          </div>

          {filtered.map((folder, i) => (
            <div key={folder.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px 140px',
              gap: 'var(--space-4)', alignItems: 'center',
              padding: 'var(--space-4) var(--space-5)',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
              transition: 'background var(--duration-fast)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Title + sub */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-lg)', background: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)', flexShrink: 0 }}>
                  <Icon d={IC.folder} size={16} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.title}</p>
                  {folder.description && (
                    <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.description}</p>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{folder.note_count ?? 0}</span>
              <Badge variant={folder.visibility === 'public' ? 'accent' : 'muted'}>{folder.visibility}</Badge>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(folder.updated_at)}</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {folder.visibility === 'private' && (
                  <Button variant="accent-ghost" size="xs" onClick={() => setShareItem(folder)}>Share</Button>
                )}
                <Button variant="ghost" size="xs">Edit</Button>
                <Button variant="danger" size="xs" onClick={() => setConfirmDelete(folder.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="📁" title="No folders found" description="Create your first folder to get started." action={<Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)} leftIcon={<Icon d={IC.plus} size={14} />}>New folder</Button>} />
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <>
          <div onClick={() => setConfirmDelete(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)', width: '360px', boxShadow: 'var(--shadow-xl)' }}>
            <h4 style={{ marginBottom: 'var(--space-3)' }}>Delete folder?</h4>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>This will permanently delete the folder and all its notes. This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => handleDeleteFolder(confirmDelete)}>Delete</Button>
            </div>
          </div>
        </>
      )}

      {/* Create Folder Modal */}
      {isCreateOpen && (
        <>
          <div onClick={() => setIsCreateOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)', width: '400px', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>New Folder</h3>
            <form onSubmit={handleCreateFolder} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input label="Folder Title *" placeholder="My new folder" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
              <Input label="Description" placeholder="A short description of this folder" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>Visibility</label>
                <div style={{ display: 'flex', gap: 'var(--space-3)', background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '4px', width: 'fit-content' }}>
                  <button type="button" onClick={() => setNewVisibility('public')} style={{ padding: '6px 12px', border: 'none', background: newVisibility === 'public' ? 'var(--color-accent-subtle)' : 'transparent', color: newVisibility === 'public' ? 'var(--color-accent)' : 'var(--color-text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>🌎 Public</button>
                  <button type="button" onClick={() => setNewVisibility('private')} style={{ padding: '6px 12px', border: 'none', background: newVisibility === 'private' ? 'var(--color-accent-subtle)' : 'transparent', color: newVisibility === 'private' ? 'var(--color-accent)' : 'var(--color-text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>🔒 Private</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm">Create Folder</Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Share Modal */}
      {shareItem && (
        <ShareModal
          isOpen={!!shareItem}
          onClose={() => setShareItem(null)}
          itemId={shareItem.id}
          itemTitle={shareItem.title}
          itemType="folder"
          itemSlug={shareItem.slug}
        />
      )}
    </DashboardLayout>
  )
}
