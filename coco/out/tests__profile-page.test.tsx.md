# tests/profile-page.test.tsx
lines:259 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ProfilePage from '../app/profile/page';

// Hoist mock setup
vi.mock('../hooks/shared/use-session', () => ({
  useSession: vi.fn(),
}));

import { useSession } from '../hooks/shared/use-session';
import { getUserQuizzes } from '../lib/actions/profile-actions';

// Mock Header
vi.mock('../components/layout/Header', () => ({
  default: () => <div data-testid="header-mock" />
}));

// Mock actions
vi.mock('../lib/actions/profile-actions', () => ({
  getUserQuizzes: vi.fn(),
  exportUserData: vi.fn(),
  getQuestionAnalytics: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock('../lib/actions/community-actions', () => ({
  getSuggestionsForAuthor: vi.fn().mockResolvedValue([]),
  resolveSuggestion: vi.fn().mockResolvedValue({ ok: true }),
}));

import { getSuggestionsForAuthor, resolveSuggestion } from '../lib/actions/community-actions';

function mockSignedInAs(wallet: string | null) {
  (useSession as import("vitest").Mock).mockReturnValue({
    account: { id: 'acct-1', wallet },
    refresh: vi.fn(),
    requireSignIn: async () => true,
  });
}

