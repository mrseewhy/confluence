import type { CSSProperties } from 'react'

interface PaginationBarProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  onPageChange: (page: number) => void
  /** Additional inline styles */
  style?: CSSProperties
  /** Size variant */
  size?: 'sm' | 'md'
}

const btnBase: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontWeight: 500,
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  cursor: 'pointer',
  transition: 'background var(--duration-fast), color var(--duration-fast)',
}

function getSizeStyles(size: 'sm' | 'md') {
  return size === 'sm'
    ? { fontSize: '11px', padding: '4px 10px' }
    : { fontSize: 'var(--font-size-sm)', padding: 'var(--space-2) var(--space-4)' }
}

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  style,
  size = 'sm',
}: PaginationBarProps) {
  if (totalPages <= 1) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: size === 'sm' ? 'var(--space-3) var(--space-5)' : '0',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-muted)',
        ...(size === 'sm' ? { borderTop: '1px solid var(--color-border)' } : {}),
        ...style,
      }}
    >
      <span>
        {totalItems !== undefined
          ? `${totalItems} total · Page ${currentPage} of ${totalPages}`
          : `Page ${currentPage} of ${totalPages}`}
      </span>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{
            ...btnBase,
            ...getSizeStyles(size),
            background: currentPage <= 1 ? 'var(--color-bg-muted)' : 'var(--color-bg-elevated)',
            color: currentPage <= 1 ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            cursor: currentPage <= 1 ? 'default' : 'pointer',
          }}
          aria-label="Previous page"
        >
          ← Prev
        </button>
        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{
            ...btnBase,
            ...getSizeStyles(size),
            background: currentPage >= totalPages ? 'var(--color-bg-muted)' : 'var(--color-bg-elevated)',
            color: currentPage >= totalPages ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            cursor: currentPage >= totalPages ? 'default' : 'pointer',
          }}
          aria-label="Next page"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
