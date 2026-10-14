# tests/auth-integration.test.tsx
lines:165 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SessionProvider, useSession } from '../hooks/shared/use-session';
import { getSessionInfo } from '../lib/actions/auth-actions';
import AuthPopup from '../components/auth/AuthPopup';

vi.mock('../lib/actions/auth-actions', () => ({
  getSessionInfo: vi.fn(),
}));

vi.mock('../components/auth/AuthPopup', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="sign-in-modal">
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    ) : null,
}));

const ACCOUNT = { id: 'acct-1', wallet: '0x' + 'a'.repeat(40) };

function TestConsumer({ onResult }: { onResult: (ok: boolean) => void }) {
  const { account, requireSignIn, refresh, modalOpen, cancelSignIn } = useSession();
  return (
    <div>
      {/* WalletProviders renders the popup in the app; the session only holds its state */}
      <AuthPopup isOpen={modalOpen} onClose={cancelSignIn} refresh={refresh} />
      <span data-testid="account">{account ? account.id : 'none'}</span>
      <button type="button" onClick={() => void requireSignIn().then(onResult)}>
        Require sign in
      </button>
      <button type="button" onClick={() => void refresh()}>
        Refresh
      </button>
    </div>
  );
}
