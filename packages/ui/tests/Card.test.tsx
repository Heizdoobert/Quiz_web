import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../src/components/Card';

describe('Card Primitive', () => {
  it('renders card with composite header, content, and footer', () => {
    render(
      <Card data-testid="test-card">
        <CardHeader>
          <CardTitle>Quiz Title</CardTitle>
          <CardDescription>Topic Description</CardDescription>
        </CardHeader>
        <CardContent>Main question content</CardContent>
        <CardFooter>Action button here</CardFooter>
      </Card>
    );

    const card = screen.getByTestId('test-card');
    expect(card).toBeDefined();
    expect(card.className).toContain('qq-card');
    expect(screen.getByRole('heading', { level: 3, name: 'Quiz Title' })).toBeDefined();
    expect(screen.getByText('Topic Description')).toBeDefined();
    expect(screen.getByText('Main question content')).toBeDefined();
    expect(screen.getByText('Action button here')).toBeDefined();
  });

  it('renders variants and padding modifiers', () => {
    const { rerender } = render(
      <Card variant="bordered" padding="lg" data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );
    const card = screen.getByTestId('card');
    expect(card.className).toContain('qq-card--bordered');
    expect(card.className).toContain('qq-card--p-lg');

    rerender(
      <Card variant="flat" padding="none" data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    );
    expect(card.className).toContain('qq-card--flat');
    expect(card.className).toContain('qq-card--p-none');
  });

  it('supports custom heading levels in CardTitle', () => {
    render(<CardTitle as="h2">Custom Level Title</CardTitle>);
    expect(screen.getByRole('heading', { level: 2, name: 'Custom Level Title' })).toBeDefined();
  });
});
