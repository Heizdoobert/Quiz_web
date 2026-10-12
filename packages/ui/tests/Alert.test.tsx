import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Alert } from '../src/components/Alert';

describe('Alert Primitive (TDD)', () => {
  it('renders alert message and defaults to info type with role="alert"', () => {
    render(<Alert message="Quiz submitted successfully" />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
    expect(alert.className).toContain('qq-alert');
    expect(alert.className).toContain('qq-alert--info');
    expect(screen.getByText('Quiz submitted successfully')).toBeDefined();
  });

  it('renders all alert types', () => {
    const { rerender } = render(<Alert type="success" message="Success message" />);
    expect(screen.getByRole('alert').className).toContain('qq-alert--success');

    rerender(<Alert type="warning" message="Warning message" />);
    expect(screen.getByRole('alert').className).toContain('qq-alert--warning');

    rerender(<Alert type="error" message="Error message" />);
    expect(screen.getByRole('alert').className).toContain('qq-alert--error');
  });

  it('renders title and description when both provided', () => {
    render(
      <Alert
        title="Session Expired"
        description="Please log in again to continue your test."
      />
    );
    expect(screen.getByText('Session Expired')).toBeDefined();
    expect(screen.getByText('Please log in again to continue your test.')).toBeDefined();
  });

  it('renders custom icon when provided', () => {
    render(
      <Alert
        message="Important Note"
        icon={<span data-testid="custom-alert-icon">⚡</span>}
      />
    );
    expect(screen.getByTestId('custom-alert-icon')).toBeDefined();
  });

  it('supports closable alert and calls onClose callback on dismiss', () => {
    const handleClose = vi.fn();
    render(
      <Alert
        message="Dismissible notification"
        closable
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(closeBtn).toBeDefined();

    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Dismissible notification')).toBeNull();
  });
});
