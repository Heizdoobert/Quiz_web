# tests/answer-and-list-guards.test.ts
lines:686 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitAnswer, getAnswerHistory } from '../lib/actions/quiz-actions';
import { createQuestion, disputeQuestion, get5050EliminatedIndices } from '../lib/actions/question-actions';
import {
  createList,
  updateList,
  confirmList,
  startContest,
  startListAttempt,
  completeListAttempt,
  claimListReward,
  getMyLists,
  getListsPendingReview,
  getListDetail,
} from '../lib/actions/question-list-actions';
import { supabase } from '../lib/supabase/supabase';
import { supabaseAdmin } from '../lib/supabase/supabase-admin';
import { getSessionAccount } from '../lib/services/session';
import { validateQuestionInput } from '../lib/utils/validation';
import { REQUIRED_CONFIRMATIONS } from '../lib/constants/list-constants';

let mockIsContestFunded = true;
let mockVoucherCheckFails = false;
let mockAnswerLimitHit = false;
const answerLimitCalls: unknown[][] = [];

vi.mock('../lib/supabase/supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock('../lib/supabase/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('../lib/services/session', () => ({ getSessionAccount: vi.fn() }));
vi.mock('../lib/services/rate-limit', () => ({
  allowAttemptFromIp: async (...args: unknown[]) => {
    answerLimitCalls.push(args);
    return !mockAnswerLimitHit;
  },
}));
vi.mock('../lib/services/chain', () => ({
  REWARD_CHAIN_ID: 84532,
  CONTEST_ESCROW_ADDRESS: '0x' + 'c'.repeat(40),
  getContestId: (listId: string, creator?: string) =>
    ('0x' + (listId + (creator || '')).replace(/[^a-f0-9]/gi, '').padEnd(64, '0').slice(0, 64)),
