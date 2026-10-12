import type { ReactNode } from 'react';

// No-op default. When sdk/tracking-analytics exists, next.config.mjs aliases this module to
// sdk/tracking-analytics/src/posthog.ts at build time (see sdk/tracking-analytics/README.md).
export const posthog = undefined;

export function PHProvider({ children }: { client?: unknown; children: ReactNode }): ReactNode {
  return children;
}
