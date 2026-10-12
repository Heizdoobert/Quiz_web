import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../src/components/Badge';

describe('Badge Primitive', () => {
  it('renders badge with label and defaults to default variant and md size', () => {
    render(<Badge>New Question</Badge>);
    const badge = screen.getByText('New Question');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('qq-badge');
    expect(badge.className).toContain('qq-badge--default');
    expect(badge.className).toContain('qq-badge--md');
  });

  it('renders all variants and sizes', () => {
    const { rerender } = render(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success').className).toContain('qq-badge--success');

    rerender(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText('Warning').className).toContain('qq-badge--warning');

    rerender(<Badge variant="danger">Danger</Badge>);
    expect(screen.getByText('Danger').className).toContain('qq-badge--danger');

    rerender(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText('Outline').className).toContain('qq-badge--outline');

    rerender(<Badge size="sm">Small</Badge>);
    expect(screen.getByText('Small').className).toContain('qq-badge--sm');
  });

  it('renders icon when provided', () => {
    render(<Badge icon={<span data-testid="badge-icon">✓</span>}>Verified</Badge>);
    expect(screen.getByTestId('badge-icon')).toBeDefined();
    expect(screen.getByText('Verified')).toBeDefined();
  });
});
