# tests/sentry-noop.test.ts
lines:12 exports:
---
import { describe, expect, it } from 'vitest';
import { captureException, initSentry } from '@/lib/sdk/sentry';

describe('lib/sdk/sentry default (no package)', () => {
  it('captureException returns undefined and does not throw', () => {
    expect(captureException(new Error('boom'))).toBeUndefined();
  });

  it('initSentry returns undefined and does not throw', () => {
    expect(initSentry()).toBeUndefined();
  });
});
