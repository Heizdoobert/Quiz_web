import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import DeleteAccount from '../components/profile/DeleteAccount';
import { deleteMyAccount } from '../lib/actions/profile-actions';

const push = vi.fn();
const clearSession = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../hooks/shared/use-session', () => ({ useSession: () => ({ clearSession }) }));
vi.mock('../lib/actions/profile-actions', () => ({ deleteMyAccount: vi.fn() }));

function openDialog() {
  render(<DeleteAccount />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
}

describe('DeleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens a dialog that says what is removed, including owned groups', () => {
    openDialog();
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toMatch(/answers/i);
    expect(dialog.textContent).toMatch(/questions you wrote/i);
    expect(dialog.textContent).toMatch(/groups you own/i);
  });

  it('keeps the confirm button disabled until the word is typed', () => {
    openDialog();
    const confirm = screen.getByRole('button', { name: 'Delete my account' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/type delete/i), { target: { value: 'DELETE' } });
    expect(confirm.disabled).toBe(false);
  });

  it('cancel closes the dialog and deletes nothing', async () => {
    openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(deleteMyAccount).not.toHaveBeenCalled();
  });

  it('clears the session and goes home on success', async () => {
    vi.mocked(deleteMyAccount).mockResolvedValue({ success: true });
    openDialog();
    fireEvent.change(screen.getByLabelText(/type delete/i), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
    expect(clearSession).toHaveBeenCalledOnce();
  });

  it('shows the error and keeps the session when deletion fails', async () => {
    vi.mocked(deleteMyAccount).mockResolvedValue({ success: false, error: 'Could not delete your account. Try again.', code: 'DELETE_FAILED' });
    openDialog();
    fireEvent.change(screen.getByLabelText(/type delete/i), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Could not delete your account');
    expect(clearSession).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('shows an error when the request throws', async () => {
    vi.mocked(deleteMyAccount).mockRejectedValue(new Error('network'));
    openDialog();
    fireEvent.change(screen.getByLabelText(/type delete/i), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(clearSession).not.toHaveBeenCalled();
  });
});
