# lib/actions/question-list-actions.ts
lines:1038 exports:createList,updateList,deleteList,getMyLists,getListDetail,addListQuestion,updateListQuestion,deleteListQuestion,submitListForReview,getListsPendingReview,confirmList,startContest,syncContestStatus,getLiveLists,getMyContestEntries,getClaimableContests,recordContestRefund,startListAttempt,completeListAttempt,claimListReward
---
'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionAccount, SessionAccount } from '@/lib/session';
import { ClientQuestion, Question, QuestionList, QuestionListWithMeta, RewardVoucher, QuestionListStatus, ListEntry } from '@/lib/types';
import { isUuid, normalizePrompt, validateQuestionInput } from '@/lib/validation';
import { MIN_LIST_QUESTIONS, REQUIRED_CONFIRMATIONS } from '@/lib/list-constants';
import { CONTEST_ESCROW_ADDRESS } from '@/lib/contracts/addresses';
import {
  REWARD_CHAIN_ID,
  isContestVoucherUsed,
  getContestOnChain,
  getSignerAccount,
  newNonce,
  getContestId,
} from '@/lib/chain';

// Every write acts for the signed-in wallet (never a wallet argument) and goes through
// the secret key: the public key can only read lists, confirmations and entries
// (lib/sql/question-lists.sql). Questions in a list stay 'pending' so they never enter
// the global pool; submitAnswer only accepts them from a wallet playing that contest.

const TOKEN_DECIMALS = BigInt(10) ** BigInt(18);
const MAX_TITLE = 100;
const MAX_DESCRIPTION = 500;
const MAX_POOL_WHOLE_TOKENS = 1_000_000;
const SAFE_QUESTION_COLUMNS = 'id, category, prompt, options, created_by, status, created_at, list_id';

type WalletRequired = { code?: 'WALLET_REQUIRED' };
type Result = { success: boolean; error?: string } & WalletRequired;

function toWei(wholeTokens: number): bigint {
  return BigInt(Math.max(0, Math.floor(wholeTokens))) * TOKEN_DECIMALS;
}

async function signedIn(): Promise<{ error: string } | { account: SessionAccount; db: NonNullable<typeof supabaseAdmin> }> {
  const account = await getSessionAccount();
  if (!account) return { error: 'Sign in to manage your lists.' };
  if (!supabaseAdmin) return { error: 'Question lists are unavailable right now.' };
