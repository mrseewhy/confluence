import { useTheme } from '@/context/theme';

/**
 * ThemeToggle
 * A minimal button to switch between light and dark themes.
 * Uses design system tokens — no hardcoded colors.
 */
export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        width: '36px',
        height: '36px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-elevated)',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontSize: '16px',
        flexShrink: 0,
        transition: `
          background var(--duration-fast) var(--ease-default),
          border-color var(--duration-fast) var(--ease-default),
          color var(--duration-fast) var(--ease-default)
        `,
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
