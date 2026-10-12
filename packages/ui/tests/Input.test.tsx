import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../src/components/Input';

describe('Input Primitive', () => {
  it('renders input with label and helper text', () => {
    render(
      <Input
        label="Username"
        helperText="Enter your player name"
        placeholder="alex123"
      />
    );
    expect(screen.getByLabelText('Username')).toBeDefined();
    expect(screen.getByText('Enter your player name')).toBeDefined();
    expect(screen.getByPlaceholderText('alex123')).toBeDefined();
  });

  it('renders error state and invalid attributes', () => {
    render(<Input label="Email" error="Invalid email address" />);
    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Invalid email address')).toBeDefined();
    expect(input.className).toContain('qq-input--error');
  });

  it('handles user typing onChange event', () => {
    const handleChange = vi.fn();
    render(<Input placeholder="Search quiz" onChange={handleChange} />);
    const input = screen.getByPlaceholderText('Search quiz');
    fireEvent.change(input, { target: { value: 'science' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('renders prefix and suffix icons', () => {
    render(
      <Input
        placeholder="With icons"
        prefixIcon={<span data-testid="prefix-icon">🔍</span>}
        suffixIcon={<span data-testid="suffix-icon">✕</span>}
      />
    );
    expect(screen.getByTestId('prefix-icon')).toBeDefined();
    expect(screen.getByTestId('suffix-icon')).toBeDefined();
  });

  it('disables input when disabled prop is provided', () => {
    render(<Input placeholder="Disabled" disabled />);
    const input = screen.getByPlaceholderText('Disabled') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
