import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { EmailTab } from '../components/auth/tabs/EmailTab';
import { requestEmailCode } from '../lib/actions/auth-actions';

vi.mock('../lib/actions/auth-actions', () => ({
  requestEmailCode: vi.fn(),
  verifyEmailCode: vi.fn(),
}));

describe('EmailTab send-code step', () => {
  const requestMock = requestEmailCode as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows the rate-limit message and stays on the email step', async () => {
    requestMock.mockResolvedValue({ sent: false, error: 'RATE_LIMITED' });
    render(<EmailTab onSuccess={vi.fn()} refresh={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByText('Send code'));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Too many requests');
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
  });

  it('moves to the code step when the code was sent', async () => {
    requestMock.mockResolvedValue({ sent: true });
    render(<EmailTab onSuccess={vi.fn()} refresh={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByText('Send code'));

    await waitFor(() => expect(screen.getByPlaceholderText('123456')).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
