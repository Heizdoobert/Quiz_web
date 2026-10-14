# lib/sdk/sentry.ts
lines:4 exports:captureException,initSentry
---
// No-op default. When sdk/tracking-analytics exists, next.config.mjs aliases this module to
// sdk/tracking-analytics/src/sentry.ts at build time (see sdk/tracking-analytics/README.md).
export const captureException: (error: unknown) => void = () => {};
export const initSentry: () => void = () => {};
