import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from '../src/components/Switch';

describe('Switch Primitive (TDD)', () => {
  it('renders switch with role="switch" and unchecked by default', () => {
    render(<Switch aria-label="Dark mode toggle" />);
    const switchEl = screen.getByRole('switch', { name: 'Dark mode toggle' });
    expect(switchEl).toBeDefined();
    expect(switchEl.getAttribute('aria-checked')).toBe('false');
    expect(switchEl.className).toContain('qq-switch');
  });

  it('renders in checked state when checked prop is true', () => {
    render(<Switch checked aria-label="Toggle notifications" onChange={() => {}} />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl.getAttribute('aria-checked')).toBe('true');
    expect(switchEl.className).toContain('qq-switch--checked');
  });

  it('toggles state and calls onChange when clicked', () => {
    const handleChange = vi.fn();
    render(<Switch onChange={handleChange} aria-label="Sound effects" />);
    const switchEl = screen.getByRole('switch');

    fireEvent.click(switchEl);
    expect(handleChange).toHaveBeenCalledWith(true);
    expect(switchEl.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(switchEl);
    expect(handleChange).toHaveBeenCalledWith(false);
    expect(switchEl.getAttribute('aria-checked')).toBe('false');
  });

  it('toggles when pressing Enter or Space key', () => {
    const handleChange = vi.fn();
    render(<Switch onChange={handleChange} aria-label="Keyboard switch" />);
    const switchEl = screen.getByRole('switch');

    fireEvent.keyDown(switchEl, { key: 'Enter' });
    expect(handleChange).toHaveBeenCalledWith(true);

    fireEvent.keyDown(switchEl, { key: ' ' });
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('does not toggle when disabled', () => {
    const handleChange = vi.fn();
    render(<Switch disabled onChange={handleChange} aria-label="Disabled option" />);
    const switchEl = screen.getByRole('switch');

    expect(switchEl.getAttribute('aria-disabled')).toBe('true');
    expect(switchEl.className).toContain('qq-switch--disabled');

    fireEvent.click(switchEl);
    expect(handleChange).not.toHaveBeenCalled();
    expect(switchEl.getAttribute('aria-checked')).toBe('false');
  });

  it('renders with size variants sm and md', () => {
    const { rerender } = render(<Switch size="sm" aria-label="Small" />);
    expect(screen.getByRole('switch').className).toContain('qq-switch--sm');

    rerender(<Switch size="md" aria-label="Medium" />);
    expect(screen.getByRole('switch').className).toContain('qq-switch--md');
  });
});
