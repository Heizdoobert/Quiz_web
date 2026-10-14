# components/providers/PostHogProvider.tsx
lines:7 exports:PostHogProvider
---
'use client';

import { PHProvider, posthog } from '@/lib/sdk/posthog';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
