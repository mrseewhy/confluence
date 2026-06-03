import { mockFolders } from '@/lib/mockData'

interface FolderSelectProps {
  value:    string
  onChange: (id: string) => void
  error?:   string
}

export function FolderSelect({ value, onChange, error }: FolderSelectProps) {
  // Only root folders (parent_id === null)
  const roots = mockFolders.filter(f => f.parent_id === null)

  const selectStyle: React.CSSProperties = {
    width:        '100%',
    fontFamily:   'var(--font-sans)',
    fontSize:     'var(--font-size-base)',
    color:        value ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
    background:   'var(--color-bg-elevated)',
    border:       `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    padding:      'var(--space-3)',
    outline:      'none',
    cursor:       'pointer',
    appearance:   'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23908E9B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat:   'no-repeat',
    backgroundPosition: 'right var(--space-3) center',
    paddingRight:       'var(--space-8)',
    transition:         'border-color var(--duration-fast)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <label style={{
        fontSize:   'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)',
        color:      'var(--color-text-primary)',
        fontFamily: 'var(--font-sans)',
      }}>
        Folder <span style={{ color: 'var(--color-danger)' }}>*</span>
      </label>

      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={selectStyle}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--color-accent)'
          e.currentTarget.style.boxShadow   = '0 0 0 3px var(--color-accent-subtle)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border)'
          e.currentTarget.style.boxShadow   = 'none'
        }}
      >
        <option value="" disabled>Select a folder…</option>

        {roots.map(root => (
          <optgroup key={root.id} label={root.title}>
            {/* Root folder itself is selectable */}
            <option value={root.id}>
              📁 {root.title}
            </option>

            {/* Subfolders */}
            {mockFolders
              .filter(f => f.parent_id === root.id)
              .map(sub => (
                <option key={sub.id} value={sub.id}>
                  &nbsp;&nbsp;└─ {sub.title}
                </option>
              ))
            }
          </optgroup>
        ))}
      </select>

      {error && (
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>
          {error}
        </span>
      )}
    </div>
  )
}
