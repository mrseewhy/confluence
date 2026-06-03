import React from 'react'

// ============================================================
// Badge
// ============================================================

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted'

const badgeStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: 'var(--color-bg-muted)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' },
  accent:  { background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', borderColor: 'var(--color-accent-muted)' },
  success: { background: 'var(--color-success-subtle)', color: 'var(--color-success)', borderColor: 'var(--color-success)' },
  warning: { background: 'var(--color-warning-subtle)', color: 'var(--color-warning)', borderColor: 'var(--color-warning)' },
  danger:  { background: 'var(--color-danger-subtle)', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' },
  muted:   { background: 'transparent', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' },
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  style?: React.CSSProperties
}

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: 'var(--font-size-xs)',
      fontWeight: 'var(--font-weight-medium)',
      fontFamily: 'var(--font-sans)',
      letterSpacing: 'var(--letter-spacing-wide)',
      padding: '0.2em 0.6em',
      borderRadius: 'var(--radius-full)',
      border: '1px solid',
      whiteSpace: 'nowrap',
      ...badgeStyles[variant],
      ...style,
    }}>
      {children}
    </span>
  )
}

// ============================================================
// Button
// ============================================================

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent-ghost'
type BtnSize    = 'xs' | 'sm' | 'md' | 'lg'

const btnVariantStyles: Record<BtnVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-accent)',
    color: '#fff',
    borderColor: 'var(--color-accent)',
  },
  secondary: {
    background: 'var(--color-bg-elevated)',
    color: 'var(--color-text-primary)',
    borderColor: 'var(--color-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    borderColor: 'transparent',
  },
  'accent-ghost': {
    background: 'var(--color-accent-subtle)',
    color: 'var(--color-accent)',
    borderColor: 'var(--color-accent-muted)',
  },
  danger: {
    background: 'var(--color-danger-subtle)',
    color: 'var(--color-danger)',
    borderColor: 'var(--color-danger)',
  },
}

const btnSizeStyles: Record<BtnSize, React.CSSProperties> = {
  xs: { fontSize: 'var(--font-size-xs)', padding: '0.25em 0.6em', borderRadius: 'var(--radius-sm)' },
  sm: { fontSize: 'var(--font-size-sm)', padding: '0.35em 0.85em' },
  md: { fontSize: 'var(--font-size-base)', padding: '0.5em 1.1em' },
  lg: { fontSize: 'var(--font-size-md)', padding: '0.65em 1.5em' },
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--font-weight-medium)',
        letterSpacing: 'var(--letter-spacing-snug)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid transparent',
        cursor: 'pointer',
        transition: 'all var(--duration-fast) var(--ease-default)',
        whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined,
        ...btnSizeStyles[size],
        ...btnVariantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
}

// ============================================================
// Input
// ============================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: React.ReactNode
}

export function Input({ label, hint, error, leftIcon, style, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {leftIcon && (
          <span style={{
            position: 'absolute',
            left: 'var(--space-3)',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          }}>
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          style={{
            width: '100%',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text-primary)',
            background: 'var(--color-bg-elevated)',
            border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: leftIcon ? 'var(--space-3) var(--space-3) var(--space-3) var(--space-8)' : 'var(--space-3)',
            outline: 'none',
            transition: 'border-color var(--duration-fast) var(--ease-default), box-shadow var(--duration-fast) var(--ease-default)',
            ...style,
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--color-accent)'
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-subtle)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          {...props}
        />
      </div>
      {hint && !error && (
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>{error}</span>
      )}
    </div>
  )
}

// ============================================================
// Card
// ============================================================

interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
  hoverable?: boolean
}

export function Card({ children, style, onClick, hoverable = false }: CardProps) {
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hoverable && setHovered(true)}
      onMouseLeave={() => hoverable && setHovered(false)}
      style={{
        background: 'var(--color-bg-elevated)',
        border: `1px solid ${hovered ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'all var(--duration-normal) var(--ease-default)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================
// Divider
// ============================================================

export function Divider({ style, children }: { style?: React.CSSProperties; children?: React.ReactNode }) {
  if (children) {
    return (
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        margin: 'var(--space-8) 0',
        ...style,
      }}>
        <div style={{ flex: 1, borderTop: '1px solid var(--color-border)' }} />
        {children}
        <div style={{ flex: 1, borderTop: '1px solid var(--color-border)' }} />
      </div>
    )
  }
  return (
    <hr style={{
      border: 'none',
      borderTop: '1px solid var(--color-border)',
      margin: 'var(--space-8) 0',
      ...style,
    }} />
  )
}

// ============================================================
// Section Label
// ============================================================

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 'var(--font-size-xs)',
      fontWeight: 'var(--font-weight-semibold)',
      letterSpacing: 'var(--letter-spacing-wider)',
      textTransform: 'uppercase',
      color: 'var(--color-text-muted)',
      marginBottom: 'var(--space-4)',
      fontFamily: 'var(--font-sans)',
    }}>
      {children}
    </p>
  )
}

// ============================================================
// Empty State
// ============================================================

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-20) var(--space-8)',
      textAlign: 'center',
      gap: 'var(--space-4)',
    }}>
      {icon && <span style={{ fontSize: '40px', opacity: 0.5 }}>{icon}</span>}
      <h4 style={{ color: 'var(--color-text-primary)', margin: 0 }}>{title}</h4>
      {description && (
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', maxWidth: '360px', margin: 0 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
