import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostHogProvider } from '@/components/providers/PostHogProvider';

// Without sdk/tracking-analytics the seam must not touch posthog-js at all.
vi.mock('posthog-js', () => {
  throw new Error('posthog-js must not load without sdk/tracking-analytics');
});

describe('PostHogProvider (no package)', () => {
  it('renders its children', () => {
    render(
      <PostHogProvider>
        <p>child</p>
      </PostHogProvider>
    );
    expect(screen.getByText('child')).toBeTruthy();
  });
});
