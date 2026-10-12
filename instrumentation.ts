import { initSentry } from '@/lib/sdk/sentry';

// Runs once per server runtime (nodejs and edge). initSentry is a no-op unless sdk/tracking-analytics is present.
export function register() {
  initSentry();
}
