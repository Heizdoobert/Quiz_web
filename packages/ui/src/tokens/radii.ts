export const radii = {
  none: '0px',
  sm: 'var(--radius-sm, 0.25rem)',
  md: 'var(--radius-md, 0.375rem)',
  lg: 'var(--radius-lg, 0.5rem)',
  xl: 'var(--radius-xl, 0.75rem)',
  '2xl': 'var(--radius-2xl, 1rem)',
  full: '9999px',
} as const;

export type Radii = typeof radii;
