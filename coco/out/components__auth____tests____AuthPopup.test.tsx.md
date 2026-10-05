# components/auth/__tests__/AuthPopup.test.tsx
lines:218 exports:
---
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
