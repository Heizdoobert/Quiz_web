import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const init = vi.fn();
vi.mock('posthog-js', () => ({ default: { init } }));
vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="ph">{children}</div>,
}));

describe('PostHogProvider', () => {
  it('initialises the client once and renders its children', async () => {
    const { PostHogProvider } = await import('../components/providers/PostHogProvider');
    render(
      <PostHogProvider>
        <p>child</p>
      </PostHogProvider>
    );
    expect(init).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ph').textContent).toBe('child');
  });
});
