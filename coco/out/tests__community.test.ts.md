# tests/community.test.ts
lines:549 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  rateQuestion,
  addComment,
  deleteComment,
  getQuestionDiscussion,
  getSuggestionsForAuthor,
  resolveSuggestion,
} from '../lib/actions/community-actions';
import { supabaseAdmin } from '../lib/supabase-admin';
import { supabase } from '../lib/supabase';
import { getSessionAccount } from '../lib/session';

vi.mock('../lib/session', () => ({
  getSessionAccount: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

vi.mock('../lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

const VALID_QID = '11111111-1111-4111-8111-111111111111';
const VALID_CID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const AUTHOR_ID = '44444444-4444-4444-8444-444444444444';

function mockSession(id = USER_ID) {
  (getSessionAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    wallet: '0x123',
    display: 'TestUser',
