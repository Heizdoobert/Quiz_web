export const colors = {
  primary: {
    DEFAULT: 'var(--color-primary, #6366f1)',
    hover: 'var(--color-primary-hover, #4f46e5)',
    active: 'var(--color-primary-active, #4338ca)',
    foreground: 'var(--color-primary-foreground, #ffffff)',
  },
  secondary: {
    DEFAULT: 'var(--color-secondary, #3b82f6)',
    hover: 'var(--color-secondary-hover, #2563eb)',
    active: 'var(--color-secondary-active, #1d4ed8)',
    foreground: 'var(--color-secondary-foreground, #ffffff)',
  },
  accent: {
    DEFAULT: 'var(--color-accent, #10b981)',
    hover: 'var(--color-accent-hover, #059669)',
    foreground: 'var(--color-accent-foreground, #ffffff)',
  },
  destructive: {
    DEFAULT: 'var(--color-destructive, #ef4444)',
    hover: 'var(--color-destructive-hover, #dc2626)',
    active: 'var(--color-destructive-active, #b91c1c)',
    foreground: 'var(--color-destructive-foreground, #ffffff)',
  },
  surface: {
    DEFAULT: 'var(--color-surface, #1e293b)',
    subtle: 'var(--color-surface-subtle, #334155)',
    raised: 'var(--color-surface-raised, #0f172a)',
  },
  background: {
    DEFAULT: 'var(--color-background, #090d16)',
    alt: 'var(--color-background-alt, #0f172a)',
  },
  text: {
    DEFAULT: 'var(--color-text, #f8fafc)',
    muted: 'var(--color-text-muted, #94a3b8)',
    inverse: 'var(--color-text-inverse, #090d16)',
  },
  border: {
    DEFAULT: 'var(--color-border, #334155)',
    subtle: 'var(--color-border-subtle, #1e293b)',
    focus: 'var(--color-border-focus, #6366f1)',
  },
} as const;

export type Colors = typeof colors;
