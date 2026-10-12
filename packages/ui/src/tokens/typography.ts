export const typography = {
  fontFamily: {
    sans: 'var(--font-sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
    mono: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)',
  },
  fontSize: {
    xs: 'var(--font-size-xs, 0.75rem)',
    sm: 'var(--font-size-sm, 0.875rem)',
    base: 'var(--font-size-base, 1rem)',
    lg: 'var(--font-size-lg, 1.125rem)',
    xl: 'var(--font-size-xl, 1.25rem)',
    '2xl': 'var(--font-size-2xl, 1.5rem)',
    '3xl': 'var(--font-size-3xl, 1.875rem)',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export type Typography = typeof typography;
