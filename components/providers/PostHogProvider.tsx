'use client';

import { PHProvider, posthog } from '@/lib/sdk/posthog';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
