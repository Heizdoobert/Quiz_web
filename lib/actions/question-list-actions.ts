'use server';
import { logger } from "@/lib/logger";

import { supabase } from '@/lib/supabase/supabase';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { getSessionAccount, SessionAccount } from '@/lib/services/session';
import { ClientQuestion, Question, QuestionList, QuestionListWithMeta, RewardVoucher, QuestionListStatus, ListEntry } from '@/lib/types';
import { isUuid, normalizePrompt, validateQuestionInput } from '@/lib/utils/validation';
import { MIN_LIST_QUESTIONS, REQUIRED_CONFIRMATIONS } from '@/lib/constants/list-constants';
import { CONTEST_ESCROW_ADDRESS } from '@/lib/contracts/addresses';
import {
  REWARD_CHAIN_ID,
  isContestVoucherUsed,
  getContestOnChain,
  getSignerAccount,
  newNonce,
  getContestId,
} from '@/lib/utils/chain';

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
  return { account, db: supabaseAdmin };
}

// Contests pay out on-chain, so their actions need an address to sign for. The UI fronts
// this with "Add a wallet to join contests"; WALLET_REQUIRED lets it tell this case apart.
async function signedInWithWallet(): Promise<
  ({ error: string } & WalletRequired) | { account: SessionAccount; wallet: string; db: NonNullable<typeof supabaseAdmin> }
> {
  const auth = await signedIn();
  if ('error' in auth) return { error: auth.error };
  if (!auth.account.wallet) return { error: 'Add a wallet to your account to play contests.', code: 'WALLET_REQUIRED' };
  return { account: auth.account, wallet: auth.account.wallet, db: auth.db };
}

function validateListText(params: { title?: string; description?: string }) {
  if (params.title !== undefined) {
    const title = typeof params.title === 'string' ? params.title.trim() : '';
    if (title.length < 5) return 'Title must be at least 5 characters long.';
    if (title.length > MAX_TITLE) return `Title must be at most ${MAX_TITLE} characters.`;
  }
  if (params.description !== undefined) {
    const description = typeof params.description === 'string' ? params.description.trim() : '';
    if (description.length > MAX_DESCRIPTION) return `Description must be at most ${MAX_DESCRIPTION} characters.`;
  }
  return null;
}

async function attachListMeta(lists: QuestionList[], viewerAccountId?: string | null): Promise<QuestionListWithMeta[]> {
  return Promise.all(
    lists.map(async (list) => {
      const [questionCount, { data: confirmations }, pCount] = await Promise.all([
        supabaseAdmin
          ? supabaseAdmin
              .from('questions')
              .select('id', { count: 'exact', head: true })
              .eq('list_id', list.id)
              .then((r) => r.count ?? 0)
          : Promise.resolve(0),
        supabase.from('question_list_confirmations').select('confirmer_user').eq('list_id', list.id),
        (list.status === 'live' || list.status === 'completed' || list.status === 'expired') && supabaseAdmin
          ? supabaseAdmin
              .from('list_entries')
              .select('user_id', { count: 'exact', head: true })
              .eq('list_id', list.id)
              .neq('status', 'reviewer')
              .then((r) => r.count ?? 0)
          : Promise.resolve(0),
      ]);

      const confirmationCount = confirmations?.length ?? 0;
      const maxParticipants = BigInt(list.max_participants || 10);
      const perQuestionReward =
        questionCount > 0 && maxParticipants > BigInt(0)
          ? (BigInt(list.reward_pool_tokens || '0') / maxParticipants / BigInt(questionCount)).toString()
          : '0';

      return {
        ...list,
        questionCount,
        confirmationCount,
        participantCount: pCount || 0,
        hasConfirmed: viewerAccountId
          ? confirmations?.some((c) => c.confirmer_user === viewerAccountId) ?? false
          : undefined,
        perQuestionReward,
      };
    })
  );
}

// An account that has seen a list's answers (reviewers) may never play it. wallet_address
// is written directly too (null for a wallet-less account), same as the other account-id
// migrated inserts, so readers of the old column stay correct until it's dropped in Task 25.
async function markReviewer(db: NonNullable<typeof supabaseAdmin>, listId: string, account: SessionAccount) {
  const { error } = await db
    .from('list_entries')
    .upsert(
      { list_id: listId, user_id: account.id, wallet_address: account.wallet, status: 'reviewer' },
      { ignoreDuplicates: true }
    );
  return !error;
}

export async function createList(params: {
  title: string;
  description?: string;
}): Promise<{ success: boolean; list?: QuestionList; error?: string }> {
  try {
    const invalid = validateListText({ title: params.title ?? '', description: params.description ?? '' });
    if (invalid) return { success: false, error: invalid };
    const auth = await signedIn();
    if ('error' in auth) return { success: false, error: auth.error };

    const { data, error } = await auth.db
      .from('question_lists')
      .insert({
        owner_user: auth.account.id,
        owner_wallet: auth.account.wallet,
        title: params.title.trim(),
        description: params.description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('createList error:', error);
      return { success: false, error: 'Failed to create list.' };
    }
    return { success: true, list: data as QuestionList };
  } catch (err) {
    logger.error('createList error:', err);
    return { success: false, error: 'Failed to create list.' };
  }
}

async function getOwnedDraftList(listId: string) {
  if (!isUuid(listId)) return { error: 'List not found.' } as const;
  const auth = await signedIn();
  if ('error' in auth) return { error: auth.error } as const;
  const { data: list, error } = await auth.db
    .from('question_lists')
    .select('id, owner_user, status')
    .eq('id', listId)
    .maybeSingle();
  if (error || !list) return { error: 'List not found.' } as const;
  if (list.owner_user !== auth.account.id) return { error: 'Only the owner can modify this list.' } as const;
  if (list.status !== 'draft') return { error: 'Only draft lists can be edited.' } as const;
  return { ...auth, list } as const;
}

export async function updateList(listId: string, params: { title?: string; description?: string }): Promise<Result> {
  try {
    const invalid = validateListText(params);
    if (invalid) return { success: false, error: invalid };
    const owned = await getOwnedDraftList(listId);
    if ('error' in owned) return { success: false, error: owned.error };

    const update: Record<string, string | null> = {};
    if (params.title !== undefined) update.title = params.title.trim();
    if (params.description !== undefined) update.description = params.description.trim() || null;

    const { error } = await owned.db.from('question_lists').update(update).eq('id', listId);
    if (error) {
      logger.error('updateList error:', error);
      return { success: false, error: 'Failed to update list.' };
    }
    return { success: true };
  } catch (err) {
    logger.error('updateList error:', err);
    return { success: false, error: 'Failed to update list.' };
  }
}

export async function deleteList(listId: string): Promise<Result> {
  try {
    const owned = await getOwnedDraftList(listId);
    if ('error' in owned) return { success: false, error: owned.error };

    const { error } = await owned.db.from('question_lists').delete().eq('id', listId);
    if (error) {
      logger.error('deleteList error:', error);
      return { success: false, error: 'Failed to delete list.' };
    }
    return { success: true };
  } catch (err) {
    logger.error('deleteList error:', err);
    return { success: false, error: 'Failed to delete list.' };
  }
}

export async function getMyLists(): Promise<QuestionListWithMeta[]> {
  try {
    const account = await getSessionAccount();
    if (!account) return [];
    const { data: lists, error } = await supabase
      .from('question_lists')
      .select('*')
      .eq('owner_user', account.id)
      .order('created_at', { ascending: false });
    if (error || !lists) return [];

    return await attachListMeta(lists as QuestionList[]);
  } catch (err) {
    logger.error('getMyLists error:', err);
    return [];
  }
}

// Answers are included only for the owner, and for signed-in reviewers of a submitted
// list (who are then barred from playing it). Everyone else gets the public columns.
export async function getListDetail(
  listId: string
): Promise<{ list: QuestionListWithMeta; questions: Question[] } | null> {
  try {
    if (!isUuid(listId) || !supabaseAdmin) return null;
    const { data: list, error } = await supabase.from('question_lists').select('*').eq('id', listId).maybeSingle();
    if (error || !list) return null;

    const viewer = await getSessionAccount();
    const isOwner = viewer?.id === list.owner_user;
    let withAnswers = isOwner;
    if (viewer && !isOwner && list.status === 'submitted') {
      withAnswers = await markReviewer(supabaseAdmin, listId, viewer);
    }

    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select(withAnswers ? '*' : SAFE_QUESTION_COLUMNS)
      .eq('list_id', listId)
      .order('created_at', { ascending: true });

    const [withMeta] = await attachListMeta([list as QuestionList], viewer?.id);
    return { list: withMeta, questions: (questions as unknown as Question[]) || [] };
  } catch (err) {
    logger.error('getListDetail error:', err);
    return null;
  }
}

type QuestionParams = {
  prompt: string;
  options: string[];
  correctIndex: number;
  category?: string;
  explanation?: string;
};

// Rejects a prompt that duplicates another in the list (copy-pasted, or re-typed with
// different casing/spacing to pad the list toward the minimum).
async function isDuplicatePrompt(
  db: NonNullable<typeof supabaseAdmin>,
  listId: string,
  prompt: string,
  exceptId?: string
) {
  let query = db.from('questions').select('id, prompt').eq('list_id', listId);
  if (exceptId) query = query.neq('id', exceptId);
  const { data } = await query;
  const normalized = normalizePrompt(prompt);
  return (data || []).some((q) => normalizePrompt(q.prompt) === normalized);
}

export async function addListQuestion(
  listId: string,
  params: QuestionParams
): Promise<{ success: boolean; question?: Question; error?: string }> {
  try {
    const validated = validateQuestionInput(params);
    if (!validated.valid) return { success: false, error: validated.error };
    const owned = await getOwnedDraftList(listId);
    if ('error' in owned) return { success: false, error: owned.error };

    if (await isDuplicatePrompt(owned.db, listId, validated.prompt)) {
      return { success: false, error: 'This list already has a question with the same or very similar prompt.' };
    }

    const { data, error } = await owned.db
      .from('questions')
      .insert({
        prompt: validated.prompt,
        options: validated.options,
        correct_index: validated.correctIndex,
        category: validated.category,
        explanation: validated.explanation,
        created_by_user: owned.account.id,
        created_by: owned.account.wallet,
        list_id: listId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      logger.error('addListQuestion error:', error);
      return { success: false, error: 'Failed to add question.' };
    }
    return { success: true, question: data as Question };
  } catch (err) {
    logger.error('addListQuestion error:', err);
    return { success: false, error: 'Failed to add question.' };
  }
}

async function getOwnedDraftQuestion(questionId: string) {
  if (!isUuid(questionId) || !supabaseAdmin) return { error: 'Question not found.' } as const;
  const { data: question } = await supabaseAdmin
    .from('questions')
    .select('id, list_id')
    .eq('id', questionId)
    .maybeSingle();
  if (!question?.list_id) return { error: 'Question not found.' } as const;
  const owned = await getOwnedDraftList(question.list_id);
  if ('error' in owned) return { error: owned.error } as const;
  return { ...owned, listId: question.list_id as string } as const;
}

export async function updateListQuestion(questionId: string, params: QuestionParams): Promise<Result> {
  try {
    const validated = validateQuestionInput(params);
    if (!validated.valid) return { success: false, error: validated.error };
    const owned = await getOwnedDraftQuestion(questionId);
    if ('error' in owned) return { success: false, error: owned.error };

    if (await isDuplicatePrompt(owned.db, owned.listId, validated.prompt, questionId)) {
      return { success: false, error: 'This list already has a question with the same or very similar prompt.' };
    }

    const { error } = await owned.db
      .from('questions')
      .update({
        prompt: validated.prompt,
        options: validated.options,
        correct_index: validated.correctIndex,
        category: validated.category,
        explanation: validated.explanation,
      })
      .eq('id', questionId);

    if (error) {
      logger.error('updateListQuestion error:', error);
      return { success: false, error: 'Failed to update question.' };
    }
    return { success: true };
  } catch (err) {
    logger.error('updateListQuestion error:', err);
    return { success: false, error: 'Failed to update question.' };
  }
}

export async function deleteListQuestion(questionId: string): Promise<Result> {
  try {
    const owned = await getOwnedDraftQuestion(questionId);
    if ('error' in owned) return { success: false, error: owned.error };

    const { error } = await owned.db.from('questions').delete().eq('id', questionId);
    if (error) {
      logger.error('deleteListQuestion error:', error);
      return { success: false, error: 'Failed to delete question.' };
    }
    return { success: true };
  } catch (err) {
    logger.error('deleteListQuestion error:', err);
    return { success: false, error: 'Failed to delete question.' };
  }
}

export async function submitListForReview(listId: string): Promise<Result> {
  try {
    const owned = await getOwnedDraftList(listId);
    if ('error' in owned) return { success: false, error: owned.error };

    const { count } = await owned.db
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', listId);

    if ((count ?? 0) < MIN_LIST_QUESTIONS) {
      return {
        success: false,
        error: `A list needs at least ${MIN_LIST_QUESTIONS} questions before it can be submitted for review (currently ${count ?? 0}).`,
      };
    }

    const { error } = await owned.db
      .from('question_lists')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', listId)
      .eq('status', 'draft');

    if (error) {
      logger.error('submitListForReview error:', error);
      return { success: false, error: 'Failed to submit list.' };
    }
    return { success: true };
  } catch (err) {
    logger.error('submitListForReview error:', err);
    return { success: false, error: 'Failed to submit list.' };
  }
}

export async function getListsPendingReview(): Promise<QuestionListWithMeta[]> {
  try {
    const account = await getSessionAccount();
    if (!account) return [];
    const { data: lists, error } = await supabase
      .from('question_lists')
      .select('*')
      .eq('status', 'submitted')
      .neq('owner_user', account.id)
      .order('submitted_at', { ascending: true });
    if (error || !lists) return [];

    return await attachListMeta(lists as QuestionList[], account.id);
  } catch (err) {
    logger.error('getListsPendingReview error:', err);
    return [];
  }
}

export async function confirmList(listId: string): Promise<{ success: boolean; approved?: boolean; error?: string }> {
  try {
    if (!isUuid(listId)) return { success: false, error: 'List not found.' };
    const auth = await signedIn();
    if ('error' in auth) return { success: false, error: auth.error };

    const { data: list, error: listErr } = await auth.db
      .from('question_lists')
      .select('owner_user, status')
      .eq('id', listId)
      .maybeSingle();
    if (listErr || !list) return { success: false, error: 'List not found.' };
    if (list.status !== 'submitted') return { success: false, error: 'This list is not awaiting review.' };
    if (list.owner_user === auth.account.id) return { success: false, error: 'You cannot confirm your own list.' };

    if (!(await markReviewer(auth.db, listId, auth.account))) {
      return { success: false, error: 'Failed to confirm list.' };
    }
    const { error: insertErr } = await auth.db
      .from('question_list_confirmations')
      .insert({ list_id: listId, confirmer_user: auth.account.id, confirmer_wallet: auth.account.wallet });
    if (insertErr) {
      if (insertErr.code === '23505') return { success: false, error: 'You have already confirmed this list.' };
      logger.error('confirmList insert error:', insertErr);
      return { success: false, error: 'Failed to confirm list.' };
    }

    const { count } = await auth.db
      .from('question_list_confirmations')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', listId);

    const approved = (count ?? 0) >= REQUIRED_CONFIRMATIONS;
    if (approved) {
      const { error } = await auth.db
        .from('question_lists')
        .update({ status: 'approved' })
        .eq('id', listId)
        .eq('status', 'submitted');
      if (error) logger.error('confirmList approve error:', error);
    }

    return { success: true, approved };
  } catch (err) {
    logger.error('confirmList error:', err);
    return { success: false, error: 'Failed to confirm list.' };
  }
}

export async function startContest(
  listId: string,
  rewardPoolWholeTokens: number,
  maxParticipants: number = 10
): Promise<Result> {
  try {
    if (!isUuid(listId)) return { success: false, error: 'List not found.' };
    if (
      !Number.isFinite(rewardPoolWholeTokens) ||
      rewardPoolWholeTokens <= 0 ||
      rewardPoolWholeTokens > MAX_POOL_WHOLE_TOKENS
    ) {
      return { success: false, error: `Reward pool must be between 1 and ${MAX_POOL_WHOLE_TOKENS} tokens.` };
    }
    const auth = await signedInWithWallet();
    if ('error' in auth) return { success: false, error: auth.error, code: auth.code };

    const { data: list, error: listErr } = await auth.db
      .from('question_lists')
      .select('owner_user, status')
      .eq('id', listId)
      .maybeSingle();
    if (listErr || !list) return { success: false, error: 'List not found.' };
    if (list.owner_user !== auth.account.id) return { success: false, error: 'Only the owner can start this contest.' };
    if (list.status !== 'approved') {
      return { success: false, error: `List must be approved by ${REQUIRED_CONFIRMATIONS} reviewers before starting.` };
    }

    const safeParticipants = Math.max(1, Math.min(1000, Math.floor(maxParticipants || 10)));
    const minPoolWei = toWei(rewardPoolWholeTokens);
    const contestId = getContestId(listId, auth.wallet);
    const onChain = await getContestOnChain(contestId);
    if (!onChain || !onChain.active || onChain.creator.toLowerCase() !== auth.wallet.toLowerCase() || onChain.totalPool < minPoolWei) {
      return { success: false, error: 'Contest pool has not been funded on-chain.' };
    }
    const expiresAt = new Date(Number(onChain.expiresAt) * 1000).toISOString();

    const { error } = await auth.db
      .from('question_lists')
      .update({
        status: 'live',
        owner_wallet: auth.wallet,
        reward_pool_tokens: minPoolWei.toString(),
        max_participants: safeParticipants,
        started_at: new Date().toISOString(),
        onchain_contest_id: contestId,
        expires_at: expiresAt,
      })
      .eq('id', listId)
      .eq('status', 'approved');

    if (error) {
      logger.error('startContest error:', error);
      return { success: false, error: 'Failed to start contest.' };
    }
    return { success: true };
  } catch (err) {
    logger.error('startContest error:', err);
    return { success: false, error: 'Failed to start contest.' };
  }
}

export async function syncContestStatus(listId: string): Promise<void> {
  if (!isUuid(listId) || !supabaseAdmin) return;
  
  const { data: list } = await supabaseAdmin
    .from('question_lists')
    .select('status, onchain_contest_id, max_participants')
    .eq('id', listId)
    .maybeSingle();
    
  if (!list || list.status !== 'live') return;

  let newStatus: QuestionListStatus | null = null;

  const { count } = await supabaseAdmin
    .from('list_entries')
    .select('user_id', { count: 'exact', head: true })
    .eq('list_id', listId)
    .neq('status', 'reviewer');

  if (count !== null && count >= (list.max_participants || 10)) {
    newStatus = 'completed';
  } else if (list.onchain_contest_id) {
    const onChain = await getContestOnChain(list.onchain_contest_id as `0x${string}`);
    if (onChain) {
      if (!onChain.active) {
        newStatus = onChain.remainingPool === BigInt(0) ? 'completed' : 'refunded';
      } else if (Math.floor(Date.now() / 1000) >= Number(onChain.expiresAt)) {
        newStatus = 'expired';
      }
    }
  }

  if (newStatus) {
    await supabaseAdmin.from('question_lists').update({ status: newStatus }).eq('id', listId);
  }
}

export async function getLiveLists(): Promise<QuestionListWithMeta[]> {
  try {
    const { data: lists, error } = await supabase
      .from('question_lists')
      .select('*')
      .eq('status', 'live')
      .order('started_at', { ascending: false });
    if (error || !lists) return [];

    const now = new Date();
    const activeLists = [];
    for (const list of (lists as QuestionList[])) {
      if (list.expires_at && new Date(list.expires_at) < now) {
        syncContestStatus(list.id).catch((err) => logger.error('error', err));
      } else {
        activeLists.push(list);
      }
    }

    return await attachListMeta(activeLists);
  } catch (err) {
    logger.error('getLiveLists error:', err);
    return [];
  }
}

export async function getMyContestEntries(): Promise<ListEntry[]> {
  try {
    const account = await getSessionAccount();
    if (!account) return [];
    const { data: entries, error } = await supabase
      .from('list_entries')
      .select('*')
      .eq('user_id', account.id)
      .order('created_at', { ascending: false });
    if (error || !entries) return [];
    return entries as ListEntry[];
  } catch (err) {
    logger.error('getMyContestEntries error:', err);
    return [];
  }
}

export async function getClaimableContests(): Promise<QuestionListWithMeta[]> {
  try {
    const account = await getSessionAccount();
    if (!account) return [];
    
    const { data: entries } = await supabase
      .from('list_entries')
      .select('list_id')
      .eq('user_id', account.id)
      .eq('status', 'completed');
      
    if (!entries?.length) return [];
    const listIds = entries.map(e => e.list_id);
    
    const { data: lists } = await supabase
      .from('question_lists')
      .select('*')
      .in('id', listIds);
      
    if (!lists) return [];
    return await attachListMeta(lists as QuestionList[]);
  } catch (err) {
    logger.error('getClaimableContests error:', err);
    return [];
  }
}

export async function recordContestRefund(listId: string, txHash: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isUuid(listId) || !supabaseAdmin) return { success: false, error: 'Invalid request' };
    const account = await getSessionAccount();
    if (!account) return { success: false, error: 'Unauthorized' };

    const { data: list } = await supabaseAdmin
      .from('question_lists')
      .select('owner_user')
      .eq('id', listId)
      .maybeSingle();
      
    if (list?.owner_user !== account.id) return { success: false, error: 'Unauthorized' };

    await supabaseAdmin
      .from('question_lists')
      .update({
        status: 'refunded',
        refund_tx_hash: txHash,
        refunded_at: new Date().toISOString(),
      })
      .eq('id', listId);
      
    return { success: true };
  } catch (err) {
    logger.error('recordContestRefund error:', err);
    return { success: false, error: 'Failed to record refund' };
  }
}

export async function startListAttempt(
  listId: string
): Promise<{ success: boolean; questions?: ClientQuestion[]; answeredQuestionIds?: string[]; result?: { correctCount: number; rewardAmount: string; claimed: boolean }; error?: string } & WalletRequired> {
  try {
    if (!isUuid(listId)) return { success: false, error: 'This contest is not live.' };
    const auth = await signedInWithWallet();
    if ('error' in auth) return { success: false, error: auth.error, code: auth.code };

    const { data: list, error: listErr } = await auth.db
      .from('question_lists')
      .select('status, owner_user, max_participants, onchain_contest_id')
      .eq('id', listId)
      .maybeSingle();
    // Allow playing/claiming if it's completed, but not if it's draft or rejected.
    if (listErr || !list || !['live', 'completed', 'expired'].includes(list.status)) {
      return { success: false, error: 'This contest is not active.' };
    }
    if (list.owner_user === auth.account.id) return { success: false, error: 'You cannot play your own contest.' };

    const { data: entry } = await auth.db
      .from('list_entries')
      .select('status, correct_count, reward_amount')
      .eq('list_id', listId)
      .eq('user_id', auth.account.id)
      .maybeSingle();

    if (entry?.status === 'reviewer') {
      return { success: false, error: 'You reviewed this list, so you cannot play it.' };
    }
    if (entry && (entry.status === 'completed' || entry.status === 'claimed')) {
      return { 
        success: true, 
        result: {
          correctCount: entry.correct_count,
          rewardAmount: entry.reward_amount,
          claimed: entry.status === 'claimed'
        }
      };
    }
    if (!entry) {
      const maxParticipants = list.max_participants || 10;
      const { count } = await auth.db
        .from('list_entries')
        .select('user_id', { count: 'exact', head: true })
        .eq('list_id', listId)
        .neq('status', 'reviewer');

      if ((count ?? 0) >= maxParticipants) {
        return { success: false, error: 'This contest has reached its participant limit.' };
      }

      if (list.onchain_contest_id) {
        const onChain = await getContestOnChain(list.onchain_contest_id as `0x${string}`);
        if (!onChain || !onChain.active || onChain.remainingPool === BigInt(0)) {
          await syncContestStatus(listId);
          return { success: false, error: 'This contest has no remaining reward pool.' };
        }
      }

      const { error: insertErr } = await auth.db
        .from('list_entries')
        .insert({ list_id: listId, user_id: auth.account.id, wallet_address: auth.wallet });
      if (insertErr && insertErr.code !== '23505') {
        logger.error('startListAttempt entry error:', insertErr);
        return { success: false, error: 'Failed to start contest.' };
      }
    }

    const { data: questions, error: qErr } = await auth.db
      .from('questions')
      .select('id, category, prompt, options, created_by, status')
      .eq('list_id', listId);
    if (qErr || !questions) return { success: false, error: 'Failed to load contest questions.' };

    let answeredQuestionIds: string[] = [];
    if (questions.length > 0) {
      const { data: answeredResults } = await auth.db
        .from('quiz_results')
        .select('question_id')
        .eq('user_id', auth.account.id)
        .in('question_id', questions.map((q) => q.id));

      answeredQuestionIds = (answeredResults || []).map((r) => r.question_id);
    }

    return {
      success: true,
      questions: questions.map((row) => ({
        id: row.id,
        category: row.category,
        prompt: row.prompt,
        options: Array.isArray(row.options) ? (row.options as string[]) : [],
        created_by: row.created_by || null,
        status: row.status,
      })),
      answeredQuestionIds,
    };
  } catch (err) {
    logger.error('startListAttempt error:', err);
    return { success: false, error: 'Failed to start contest.' };
  }
}

export async function completeListAttempt(
  listId: string
): Promise<{ success: boolean; correctCount?: number; rewardAmount?: string; error?: string }> {
  try {
    if (!isUuid(listId)) return { success: false, error: 'List not found.' };
    const auth = await signedInWithWallet();
    if ('error' in auth) return { success: false, error: auth.error };

    const { data: list, error: listErr } = await auth.db
      .from('question_lists')
      .select('reward_pool_tokens, max_participants')
      .eq('id', listId)
      .maybeSingle();
    if (listErr || !list) return { success: false, error: 'List not found.' };

    const { data: questions } = await auth.db.from('questions').select('id').eq('list_id', listId);
    const questionIds = (questions || []).map((q) => q.id);
    if (questionIds.length === 0) return { success: false, error: 'This contest has no questions.' };

    const { data: results } = await auth.db
      .from('quiz_results')
      .select('is_correct')
      .eq('user_id', auth.account.id)
      .in('question_id', questionIds);

    const correctCount = (results || []).filter((r) => r.is_correct).length;
    const maxParticipants = BigInt(list.max_participants || 10);
    const poolPerParticipant = BigInt(list.reward_pool_tokens || '0') / maxParticipants;
    const perQuestionReward = poolPerParticipant / BigInt(questionIds.length);
    const rewardAmount = perQuestionReward * BigInt(correctCount);

    const { data: updated, error } = await auth.db
      .from('list_entries')
      .update({
        status: 'completed',
        correct_count: correctCount,
        reward_amount: rewardAmount.toString(),
        completed_at: new Date().toISOString(),
      })
      .eq('list_id', listId)
      .eq('user_id', auth.account.id)
      .eq('status', 'in_progress')
      .select('list_id');

    if (error) {
      logger.error('completeListAttempt error:', error);
      return { success: false, error: 'Failed to finish contest.' };
    }
    if (!updated?.length) return { success: false, error: 'No contest in progress for this wallet.' };
    
    syncContestStatus(listId).catch((err) => logger.error('error', err));

    return { success: true, correctCount, rewardAmount: rewardAmount.toString() };
  } catch (err) {
    logger.error('completeListAttempt error:', err);
    return { success: false, error: 'Failed to finish contest.' };
  }
}

const VOUCHER_TTL_SECONDS = 3600;

function toContestVoucher(
  wallet: string,
  claim: { amount: string; nonce: string; deadline: string; signature: string },
  contestId: `0x${string}`,
): RewardVoucher {
  return {
    recipient: wallet,
    amount: claim.amount,
    nonce: claim.nonce,
    deadline: claim.deadline,
    signature: claim.signature,
    contractAddress: CONTEST_ESCROW_ADDRESS,
    contestId,
  };
}

export async function claimListReward(listId: string): Promise<RewardVoucher | { error: string }> {
  try {
    if (!isUuid(listId)) return { error: 'Invalid contest ID.' };
    const auth = await signedInWithWallet();
    if ('error' in auth) return { error: auth.error };

    const signer = getSignerAccount();
    if (!signer) return { error: 'Reward signing not configured' };

    const { data: entry, error: entryErr } = await auth.db
      .from('list_entries')
      .select('status, reward_amount')
      .eq('list_id', listId)
      .eq('user_id', auth.account.id)
      .maybeSingle();

    if (entryErr || !entry) return { error: 'Contest entry not found.' };
    if (entry.status === 'claimed') return { error: 'Reward has already been claimed.' };
    if (entry.status !== 'completed') return { error: 'Contest attempt has not been completed.' };

    const amount = BigInt(entry.reward_amount || '0');
    if (amount <= BigInt(0)) return { error: 'No rewards earned for this contest.' };

    const { data: list, error: listErr } = await auth.db
      .from('question_lists')
      .select('owner_wallet, status, onchain_contest_id')
      .eq('id', listId)
      .maybeSingle();

    if (listErr || !list) return { error: 'Contest not found.' };
    const contestId = (list.onchain_contest_id as `0x${string}`) || getContestId(listId, list.owner_wallet);

    // A live list was funded on-chain when it started, so an unreadable contest means an RPC
    // failure or a misconfigured escrow address: refuse rather than sign a voucher that cannot pay.
    const onChain = await getContestOnChain(contestId);
    if (!onChain) return { error: 'Could not verify the contest pool. Please try again shortly.' };
    if (!onChain.active || onChain.remainingPool < amount) {
      syncContestStatus(listId).catch((err) => logger.error('error', err));
      return { error: 'Contest reward pool has been exhausted or closed.' };
    }
    if (Math.floor(Date.now() / 1000) >= Number(onChain.expiresAt)) {
      syncContestStatus(listId).catch((err) => logger.error('error', err));
      return { error: 'Contest has expired.' };
    }

    // Reuse unexpired open voucher if already generated
    const { data: pendingClaims } = await auth.db
      .from('reward_claims')
      .select('id, nonce, amount::text, deadline, signature')
      .eq('user_id', auth.account.id)
      .eq('list_id', listId)
      .eq('status', 'pending');

    const now = Math.floor(Date.now() / 1000);

    if (pendingClaims && pendingClaims.length > 0) {
      for (const claim of pendingClaims) {
        let status: 'claimed' | 'expired' | null = null;
        if (await isContestVoucherUsed(contestId, auth.wallet, claim.nonce)) {
          status = 'claimed';
        } else if (!claim.deadline || Number(claim.deadline) <= now) {
          status = 'expired';
        }

        if (status) {
          await auth.db
            .from('reward_claims')
            .update({ status })
            .eq('id', claim.id)
            .eq('status', 'pending');
          if (status === 'claimed') {
            await auth.db
              .from('list_entries')
              .update({ status: 'claimed' })
              .eq('list_id', listId)
              .eq('user_id', auth.account.id);
            return { error: 'Reward has already been claimed.' };
          }
        } else {
          return toContestVoucher(
            auth.wallet,
            {
              amount: claim.amount,
              nonce: claim.nonce,
              deadline: String(claim.deadline),
              signature: claim.signature,
            },
            contestId,
          );
        }
      }
    }

    const nonce = newNonce();
    const ttlDeadline = now + VOUCHER_TTL_SECONDS;
    const effectiveDeadline = Math.min(ttlDeadline, Number(onChain.expiresAt));
    const deadline = BigInt(effectiveDeadline);

    const signature = await signer.signTypedData({
      domain: {
        name: 'ContestEscrow',
        version: '1',
        chainId: BigInt(REWARD_CHAIN_ID),
        verifyingContract: CONTEST_ESCROW_ADDRESS,
      },
      types: {
        ClaimContestReward: [
          { name: 'contestId', type: 'bytes32' },
          { name: 'recipient', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'ClaimContestReward',
      message: {
        contestId,
        recipient: auth.wallet as `0x${string}`,
        amount,
        nonce,
        deadline,
      },
    });

    const { error: insertErr } = await auth.db.from('reward_claims').insert({
      user_id: auth.account.id,
      wallet_address: auth.wallet,
      claim_type: 'contest',
      status: 'pending',
      list_id: listId,
      nonce: nonce.toString(),
      amount: amount.toString(),
      deadline: deadline.toString(),
      signature,
    });

    if (insertErr) {
      if (insertErr.code === '23505') {
        const { data: existing } = await auth.db
          .from('reward_claims')
          .select('id, nonce, amount::text, deadline, signature')
          .eq('user_id', auth.account.id)
          .eq('list_id', listId)
          .eq('status', 'pending')
          .maybeSingle();
        if (existing) {
          return toContestVoucher(
            auth.wallet,
            {
              amount: existing.amount,
              nonce: existing.nonce,
              deadline: String(existing.deadline),
              signature: existing.signature,
            },
            contestId,
          );
        }
      }
      logger.error('claimListReward insert error:', insertErr);
      return { error: 'Failed to record reward voucher.' };
    }

    return toContestVoucher(
      auth.wallet,
      {
        amount: amount.toString(),
        nonce: nonce.toString(),
        deadline: deadline.toString(),
        signature,
      },
      contestId,
    );
  } catch (err) {
    logger.error('claimListReward error:', err);
    return { error: 'Failed to claim contest reward.' };
  }
}

export interface ContestAnalytics {
  participation_count: number;
  completion_rate: number;
  avg_score: number;
}

export async function getContestAnalytics(listId: string): Promise<{ success: boolean; data?: ContestAnalytics; error?: string }> {
  try {
    const account = await getSessionAccount();
    if (!account) return { success: false, error: 'Unauthorized.' };

    const { data, error } = await supabase.rpc('get_contest_analytics', { p_list_id: listId }).single();

    if (error || !data) {
      logger.error('[getContestAnalytics]', error);
      return { success: false, error: 'Failed to fetch contest analytics.' };
    }

    return { success: true, data: data as ContestAnalytics };
  } catch (err) {
    logger.error('[getContestAnalytics]', err);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
