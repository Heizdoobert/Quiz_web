import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AuthPopup from '../AuthPopup';
import {
  signInWithUsername,
} from '@/lib/actions/auth-actions';

// Mock framer-motion to render immediately without animations
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => <div className={className} onClick={onClick} role="presentation">{children}</div>,
    },
  };
});

// Mock rainbowkit ConnectButton
vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button data-testid="connect-button">Connect Wallet</button>,
}));

// Mock auth actions
vi.mock('@/lib/actions/auth-actions', () => ({
  signInWithUsername: vi.fn(),
  signUpWithUsername: vi.fn(),
  requestEmailCode: vi.fn(),
  verifyEmailCode: vi.fn(),
}));

describe('AuthPopup', () => {
  const mockOnClose = vi.fn();
  const mockRefresh = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    // The Modal component relies on createPortal and useSyncExternalStore.
    // It's easier to just mock it or rely on standard rendering. We'll rely on the actual Modal logic for openness.
    // The Modal component renders AnimatePresence inside a createPortal, so we should check for nothing.
    render(<AuthPopup isOpen={false} onClose={mockOnClose} refresh={mockRefresh} />);
    expect(screen.queryByText(/Ready to play/i)).toBeFalsy();
  });

  it('renders the choice screen initially when isOpen is true', () => {
    render(<AuthPopup isOpen={true} onClose={mockOnClose} refresh={mockRefresh} />);
    expect(screen.getByText(/Ready to play/i)).toBeTruthy();
    expect(screen.getByText(/Sign In/i, { selector: 'span.text-base' })).toBeTruthy();
    expect(screen.getByText(/Create Account/i, { selector: 'span.text-base' })).toBeTruthy();
  });

  it('navigates to login method tabs when Sign In is clicked', async () => {
    render(<AuthPopup isOpen={true} onClose={mockOnClose} refresh={mockRefresh} />);
    
    // Click Sign In
    const signInBtn = screen.getByText(/Sign In/i, { selector: 'span.text-base' }).closest('button');
    fireEvent.click(signInBtn!);

    await waitFor(() => {
      // The heading should change to Sign In (the main modal header or the tabs header)
      const headings = screen.getAllByText(/Sign In/i);
      expect(headings.length).toBeGreaterThan(0);
      // Tabs should be present
      expect(screen.getByRole('button', { name: /Username/i })).toBeTruthy();
    });
  });

  it('navigates to register method tabs when Create Account is clicked', async () => {
    render(<AuthPopup isOpen={true} onClose={mockOnClose} refresh={mockRefresh} />);
    
    const createBtn = screen.getByText(/Create Account/i, { selector: 'span.text-base' }).closest('button');
    fireEvent.click(createBtn!);

    await waitFor(() => {
      expect(screen.getAllByText(/Create Account/i).length).toBeGreaterThan(0);
    });
  });

  it('can navigate back to choice screen', async () => {
    render(<AuthPopup isOpen={true} onClose={mockOnClose} refresh={mockRefresh} />);
    
    // Go to login
    const signInBtn = screen.getByText(/Sign In/i, { selector: 'span.text-base' }).closest('button');
    fireEvent.click(signInBtn!);

    // Wait for the back button
    const backBtn = await screen.findByLabelText(/Go back/i);
    fireEvent.click(backBtn);

    // Should see choice screen again
    await waitFor(() => {
      expect(screen.getByText(/Ready to play/i)).toBeTruthy();
    });
  });

  it('handles username login', async () => {
    vi.mocked(signInWithUsername).mockResolvedValue({ ok: true });
    
    render(<AuthPopup isOpen={true} onClose={mockOnClose} refresh={mockRefresh} />);
    fireEvent.click(screen.getByText(/Sign In/i, { selector: 'span.text-base' }).closest('button')!);
    
    // Fill form
    const usernameInput = await screen.findByPlaceholderText(/e\.g\. crypto_champ/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Submit
    const submitBtn = screen.getByRole('button', { name: /Sign in/i });
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(signInWithUsername).toHaveBeenCalledWith('testuser', 'password123');
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles username login error', async () => {
    vi.mocked(signInWithUsername).mockResolvedValue({ ok: false, error: 'Invalid credentials' });
    
    render(<AuthPopup isOpen={true} onClose={mockOnClose} refresh={mockRefresh} />);
    fireEvent.click(screen.getByText(/Sign In/i, { selector: 'span.text-base' }).closest('button')!);
    
    // Fill form
    const usernameInput = await screen.findByPlaceholderText(/e\.g\. crypto_champ/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeTruthy();
    });
  });

  it('navigates to Wallet tab and displays ConnectButton', async () => {
    render(<AuthPopup isOpen={true} onClose={mockOnClose} refresh={mockRefresh} />);
    fireEvent.click(screen.getByText(/Sign In/i, { selector: 'span.text-base' }).closest('button')!);
    
    const walletTab = await screen.findByRole('button', { name: /Wallet/i });
    fireEvent.click(walletTab);

    await waitFor(() => {
      expect(screen.getByTestId('connect-button')).toBeTruthy();
      expect(screen.getByText(/Supports MetaMask/i)).toBeTruthy();
    });
  });

  it('navigates to Email tab and sends code, then verifies code', async () => {
    const { requestEmailCode, verifyEmailCode } = await import('@/lib/actions/auth-actions');
    vi.mocked(requestEmailCode).mockResolvedValue({ sent: true });
    vi.mocked(verifyEmailCode).mockResolvedValue({ ok: true });

    render(<AuthPopup isOpen={true} onClose={mockOnClose} refresh={mockRefresh} />);
    fireEvent.click(screen.getByText(/Sign In/i, { selector: 'span.text-base' }).closest('button')!);
    
    const emailTab = await screen.findByRole('button', { name: /Email/i });
    fireEvent.click(emailTab);

    // Enter email
    const emailInput = await screen.findByPlaceholderText(/you@example.com/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    // Send code
    const sendBtn = screen.getByRole('button', { name: /Send code/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(requestEmailCode).toHaveBeenCalledWith('test@example.com');
    });

    // Enter code
    const codeInput = await screen.findByPlaceholderText(/123456/i);
    fireEvent.change(codeInput, { target: { value: '123456' } });

    // Verify
    const verifyBtn = screen.getByRole('button', { name: /Verify/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(verifyEmailCode).toHaveBeenCalledWith('test@example.com', '123456');
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays error on invalid email code', async () => {
    const { requestEmailCode, verifyEmailCode } = await import('@/lib/actions/auth-actions');
    vi.mocked(requestEmailCode).mockResolvedValue({ sent: true });
    vi.mocked(verifyEmailCode).mockResolvedValue({ ok: false });

    render(<AuthPopup isOpen={true} onClose={mockOnClose} refresh={mockRefresh} />);
    fireEvent.click(screen.getByText(/Sign In/i, { selector: 'span.text-base' }).closest('button')!);
    
    fireEvent.click(await screen.findByRole('button', { name: /Email/i }));

    const emailInput = await screen.findByPlaceholderText(/you@example.com/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Send code/i }));

    const codeInput = await screen.findByPlaceholderText(/123456/i);
    fireEvent.change(codeInput, { target: { value: '111111' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify/i }));

    await waitFor(() => {
      expect(screen.getByText(/Wrong or expired code/i)).toBeTruthy();
    });
  });
});
