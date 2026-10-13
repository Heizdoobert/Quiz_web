import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip } from '../src/components/Tooltip';

describe('Tooltip Primitive (TDD)', () => {
  it('renders trigger element and keeps tooltip hidden by default', () => {
    render(
      <Tooltip title="Helpful prompt">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.getByText('Hover me')).toBeDefined();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows tooltip on mouse enter and hides on mouse leave', () => {
    render(
      <Tooltip title="Helpful prompt">
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByText('Hover me');
    fireEvent.mouseEnter(trigger);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeDefined();
    expect(tooltip.textContent).toBe('Helpful prompt');
    expect(tooltip.className).toContain('qq-tooltip');
    expect(tooltip.className).toContain('qq-tooltip--top');

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows tooltip on focus and hides on blur for keyboard accessibility', () => {
    render(
      <Tooltip title="Accessible hint">
        <button>Focus me</button>
      </Tooltip>
    );

    const trigger = screen.getByText('Focus me');
    fireEvent.focus(trigger);

    expect(screen.getByRole('tooltip')).toBeDefined();
    expect(screen.getByText('Accessible hint')).toBeDefined();

    fireEvent.blur(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('supports placement variants bottom, left, right', () => {
    const { rerender } = render(
      <Tooltip title="Bottom tip" placement="bottom">
        <button>Target</button>
      </Tooltip>
    );

    fireEvent.mouseEnter(screen.getByText('Target'));
    expect(screen.getByRole('tooltip').className).toContain('qq-tooltip--bottom');

    rerender(
      <Tooltip title="Left tip" placement="left">
        <button>Target</button>
      </Tooltip>
    );
    expect(screen.getByRole('tooltip').className).toContain('qq-tooltip--left');

    rerender(
      <Tooltip title="Right tip" placement="right">
        <button>Target</button>
      </Tooltip>
    );
    expect(screen.getByRole('tooltip').className).toContain('qq-tooltip--right');
  });
});
