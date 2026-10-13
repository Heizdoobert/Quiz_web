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

describe('EmailTab register', () => {
  const requestMock = requestEmailCode as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('asks for a username and sends it with the email', async () => {
    requestMock.mockResolvedValue({ sent: true });
    render(<EmailTab mode="register" onSuccess={vi.fn()} refresh={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'quiz_champ' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByText('Send code'));

    await waitFor(() => expect(screen.getByPlaceholderText('123456')).toBeTruthy());
    expect(requestMock).toHaveBeenCalledWith('a@b.co', 'quiz_champ');
  });

  it('shows the taken-username message and stays on the first step', async () => {
    requestMock.mockResolvedValue({ sent: false, error: 'USERNAME_TAKEN' });
    render(<EmailTab mode="register" onSuccess={vi.fn()} refresh={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'quiz_champ' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByText('Send code'));

    expect((await screen.findByRole('alert')).textContent).toContain('already taken');
  });

  it('login has no username field and sends only the email', async () => {
    requestMock.mockResolvedValue({ sent: true });
    render(<EmailTab onSuccess={vi.fn()} refresh={vi.fn()} />);

    expect(screen.queryByLabelText('Username')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByText('Send code'));

    await waitFor(() => expect(requestMock).toHaveBeenCalledWith('a@b.co', undefined));
  });
});
