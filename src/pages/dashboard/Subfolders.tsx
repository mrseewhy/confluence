import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Icon } from '@/components/layout/DashboardIcon'
import { IC } from '@/components/layout/dashboardIconPaths'
import { Button, EmptyState, Input, Badge } from '@/components/ui'
import { mockCurrentUser, mockFolders } from '@/lib/mockData'
import { ShareModal } from '@/components/ShareModal'
import type { Folder, Visibility } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DashboardSubfolders() {
  const user = mockCurrentUser
  const [foldersList, setFoldersList] = useState<Folder[]>(mockFolders)
  const [search, setSearch] = useState('')
  const [shareItem, setShareItem] = useState<Folder | null>(null)

  // Creation State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [parentId, setParentId] = useState('')
  const [newVisibility, setNewVisibility] = useState<Visibility>('public') // default public!

  // Flatten all subfolders with their parent details
  const allSubfolders = foldersList
    .filter(f => f.parent_id === null)
    .flatMap(parent =>
      (parent.subfolders ?? []).map(sf => ({ ...sf, parentTitle: parent.title, parentSlug: parent.slug }))
    )

  const filtered = allSubfolders.filter(sf => {
    const q = search.toLowerCase()
    return sf.title.toLowerCase().includes(q) || sf.parentTitle.toLowerCase().includes(q)
  })

  const handleCreateSubfolder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !parentId) return

    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const newSub: Folder = {
      id: `subfolder-${Date.now()}`,
      owner_id: user.id,
      parent_id: parentId,
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      slug,
      visibility: newVisibility,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      note_count: 0,
    }

    // Update parent subfolders inside lists
    const nextList = foldersList.map(folder => {
      if (folder.id === parentId) {
        return {
          ...folder,
          subfolders: [...(folder.subfolders ?? []), newSub],
        }
      }
      return folder
    })

    // Also sync the global mock folders store
    const mockParent = mockFolders.find(f => f.id === parentId)
    if (mockParent) {
      mockParent.subfolders = [...(mockParent.subfolders ?? []), newSub]
    }

    setFoldersList(nextList)
    setIsCreateOpen(false)
    setNewTitle('')
    setNewDesc('')
    setParentId('')
    setNewVisibility('public')
  }

  return (
    <DashboardLayout user={user} variant="user">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', letterSpacing: 'var(--letter-spacing-tight)', marginBottom: 'var(--space-1)' }}>Subfolders</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{allSubfolders.length} subfolder{allSubfolders.length !== 1 ? 's' : ''} across all folders</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)} leftIcon={<Icon d={IC.plus} size={14} />}>New subfolder</Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <input
          type="search" placeholder="Search subfolders or parent folder…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', fontFamily: 'var(--font-sans)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)', outline: 'none' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-subtle)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>

      {filtered.length > 0 ? (
        <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 80px 100px 120px 140px', gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)' }}>
            {['Subfolder', 'Parent folder', 'Notes', 'Visibility', 'Updated', 'Actions'].map(h => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>{h}</span>
            ))}
          </div>

          {filtered.map((sf, i) => (
            <div key={sf.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 180px 80px 100px 120px 140px',
              gap: 'var(--space-4)', alignItems: 'center',
              padding: 'var(--space-4) var(--space-5)',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
              transition: 'background var(--duration-fast)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
                <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                  <Icon d={IC.subfolder} size={16} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sf.title}</p>
                  {sf.description && (
                    <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sf.description}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Icon d={IC.folder} size={13} />
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sf.parentTitle}</span>
              </div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{sf.note_count ?? 0}</span>
              <Badge variant={sf.visibility === 'public' ? 'accent' : 'muted'}>{sf.visibility}</Badge>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(sf.updated_at)}</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {sf.visibility === 'private' && (
                  <Button variant="accent-ghost" size="xs" onClick={() => setShareItem(sf as Folder)}>Share</Button>
                )}
                <Button variant="ghost" size="xs">Edit</Button>
                <Button variant="danger" size="xs">Delete</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="📂" title="No subfolders found" description="Add subfolders inside your folders to organise notes further." action={<Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)} leftIcon={<Icon d={IC.plus} size={14} />}>New subfolder</Button>} />
      )}

      {/* Creation Modal */}
      {isCreateOpen && (
        <>
          <div onClick={() => setIsCreateOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)', width: '400px', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>New Subfolder</h3>
            <form onSubmit={handleCreateSubfolder} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input label="Subfolder Title *" placeholder="My new subfolder" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>Parent Folder *</label>
                <select
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px var(--space-3)',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="" disabled>Select a root folder…</option>
                  {foldersList.filter(f => f.parent_id === null).map(f => (
                    <option key={f.id} value={f.id}>📁 {f.title}</option>
                  ))}
                </select>
              </div>

              <Input label="Description" placeholder="A short description of this subfolder" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>Visibility</label>
                <div style={{ display: 'flex', gap: 'var(--space-3)', background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '4px', width: 'fit-content' }}>
                  <button type="button" onClick={() => setNewVisibility('public')} style={{ padding: '6px 12px', border: 'none', background: newVisibility === 'public' ? 'var(--color-accent-subtle)' : 'transparent', color: newVisibility === 'public' ? 'var(--color-accent)' : 'var(--color-text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>🌎 Public</button>
                  <button type="button" onClick={() => setNewVisibility('private')} style={{ padding: '6px 12px', border: 'none', background: newVisibility === 'private' ? 'var(--color-accent-subtle)' : 'transparent', color: newVisibility === 'private' ? 'var(--color-accent)' : 'var(--color-text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>🔒 Private</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm">Create Subfolder</Button>
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
