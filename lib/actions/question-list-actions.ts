'use server';

import { supabase } from '@/lib/supabase';
import { ClientQuestion, Question, QuestionList, QuestionListWithMeta, RewardVoucher } from '@/lib/types';
import { normalizePrompt, validateQuestionInput } from '@/lib/actions/question-actions';
import { buildTokenClaimVoucher } from '@/lib/actions/reward-actions';

// A list must reach this many questions before it can be submitted for peer
// review, and needs this many distinct non-owner approvals before its owner
// can start it as a live contest.
export const MIN_LIST_QUESTIONS = 20;
export const REQUIRED_CONFIRMATIONS = 3;

const TOKEN_DECIMALS = BigInt(10) ** BigInt(18);

function toWei(wholeTokens: number): bigint {
  return BigInt(Math.max(0, Math.floor(wholeTokens))) * TOKEN_DECIMALS;
}

async function attachListMeta(lists: QuestionList[], viewerWallet?: string): Promise<QuestionListWithMeta[]> {
  return Promise.all(
    lists.map(async (list) => {
      const [{ count: questionCount }, { data: confirmations }] = await Promise.all([
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('list_id', list.id),
        supabase.from('question_list_confirmations').select('confirmer_wallet').eq('list_id', list.id),
      ]);

      const qCount = questionCount ?? 0;
      const confirmationCount = confirmations?.length ?? 0;
      const perQuestionReward =
        qCount > 0 ? (BigInt(list.reward_pool_tokens || '0') / BigInt(qCount)).toString() : '0';

      return {
        ...list,
        questionCount: qCount,
        confirmationCount,
        hasConfirmed: viewerWallet
          ? confirmations?.some((c) => c.confirmer_wallet === viewerWallet) ?? false
          : undefined,
        perQuestionReward,
      };
    })
  );
}

export async function createList(params: {
  ownerWallet: string;
  title: string;
  description?: string;
}): Promise<{ success: boolean; list?: QuestionList; error?: string }> {
  try {
    if (!params.ownerWallet) return { success: false, error: 'Connect a wallet to create a list.' };
    const title = params.title?.trim() || '';
    if (title.length < 5) return { success: false, error: 'Title must be at least 5 characters long.' };

    const { data, error } = await supabase
      .from('question_lists')
      .insert({
        owner_wallet: params.ownerWallet.toLowerCase(),
        title,
        description: params.description?.trim() || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, list: data as QuestionList };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

async function getOwnedDraftList(
  listId: string,
  ownerWallet: string
): Promise<{ list?: { id: string; owner_wallet: string; status: string }; error?: string }> {
  const normalized = ownerWallet?.toLowerCase();
  const { data: list, error } = await supabase
    .from('question_lists')
    .select('id, owner_wallet, status')
    .eq('id', listId)
    .single();
  if (error || !list) return { error: 'List not found.' };
  if (list.owner_wallet !== normalized) return { error: 'Only the owner can modify this list.' };
  if (list.status !== 'draft') return { error: 'Only draft lists can be edited.' };
  return { list };
}

export async function updateList(
  listId: string,
  ownerWallet: string,
  params: { title?: string; description?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getOwnedDraftList(listId, ownerWallet);
    if (error) return { success: false, error };

    const update: Record<string, string | null> = {};
    if (params.title !== undefined) {
      const title = params.title.trim();
      if (title.length < 5) return { success: false, error: 'Title must be at least 5 characters long.' };
      update.title = title;
    }
    if (params.description !== undefined) update.description = params.description.trim() || null;

    const { error: updateErr } = await supabase.from('question_lists').update(update).eq('id', listId);
    if (updateErr) return { success: false, error: updateErr.message };
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function deleteList(listId: string, ownerWallet: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getOwnedDraftList(listId, ownerWallet);
    if (error) return { success: false, error };

    const { error: deleteErr } = await supabase.from('question_lists').delete().eq('id', listId);
    if (deleteErr) return { success: false, error: deleteErr.message };
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function getMyLists(ownerWallet: string): Promise<QuestionListWithMeta[]> {
  try {
    if (!ownerWallet) return [];
    const normalized = ownerWallet.toLowerCase();
    const { data: lists, error } = await supabase
      .from('question_lists')
      .select('*')
      .eq('owner_wallet', normalized)
      .order('created_at', { ascending: false });
    if (error || !lists) return [];

    return await attachListMeta(lists as QuestionList[]);
  } catch (err) {
    console.error('getMyLists error:', err);
    return [];
  }
}

export async function getListDetail(
  listId: string,
  viewerWallet?: string
): Promise<{ list: QuestionListWithMeta; questions: Question[] } | null> {
  try {
    const { data: list, error } = await supabase.from('question_lists').select('*').eq('id', listId).single();
    if (error || !list) return null;

    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: true });

    const [withMeta] = await attachListMeta([list as QuestionList], viewerWallet?.toLowerCase());
    return { list: withMeta, questions: (questions as Question[]) || [] };
  } catch (err) {
    console.error('getListDetail error:', err);
    return null;
  }
}

export async function addListQuestion(
  listId: string,
  ownerWallet: string,
  params: {
    prompt: string;
    options: string[];
    correctIndex: number;
    category?: string;
    explanation?: string;
  }
): Promise<{ success: boolean; question?: Question; error?: string }> {
  try {
    const { error: ownerErr } = await getOwnedDraftList(listId, ownerWallet);
    if (ownerErr) return { success: false, error: ownerErr };

    const validated = validateQuestionInput(params);
    if (!validated.valid) return { success: false, error: validated.error };

    // Anti-spam guard: reject a question whose prompt is a near-duplicate of
    // one already in this list (e.g. copy-pasted or re-typed with different
    // casing/spacing to pad the list toward the 20-question minimum).
    const normalized = normalizePrompt(validated.prompt);
    const { data: existing } = await supabase.from('questions').select('prompt').eq('list_id', listId);
    if (existing?.some((q) => normalizePrompt(q.prompt) === normalized)) {
      return { success: false, error: 'This list already has a question with the same or very similar prompt.' };
    }

    const { data, error } = await supabase
      .from('questions')
      .insert({
        prompt: validated.prompt,
        options: validated.options,
        correct_index: params.correctIndex,
        category: params.category?.trim() || 'General',
        explanation: validated.explanation,
        created_by: ownerWallet.toLowerCase(),
        list_id: listId,
        status: 'pending', // hidden from the global pool until the list goes live
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, question: data as Question };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function updateListQuestion(
  questionId: string,
  ownerWallet: string,
  params: {
    prompt: string;
    options: string[];
    correctIndex: number;
    category?: string;
    explanation?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: question, error: qErr } = await supabase
      .from('questions')
      .select('id, list_id, created_by')
      .eq('id', questionId)
      .single();
    if (qErr || !question || !question.list_id) return { success: false, error: 'Question not found.' };

    const { error: ownerErr } = await getOwnedDraftList(question.list_id, ownerWallet);
    if (ownerErr) return { success: false, error: ownerErr };

    const validated = validateQuestionInput(params);
    if (!validated.valid) return { success: false, error: validated.error };

    const normalized = normalizePrompt(validated.prompt);
    const { data: existing } = await supabase
      .from('questions')
      .select('id, prompt')
      .eq('list_id', question.list_id)
      .neq('id', questionId);
    if (existing?.some((q) => normalizePrompt(q.prompt) === normalized)) {
      return { success: false, error: 'This list already has a question with the same or very similar prompt.' };
    }

    const { error } = await supabase
      .from('questions')
      .update({
        prompt: validated.prompt,
        options: validated.options,
        correct_index: params.correctIndex,
        category: params.category?.trim() || 'General',
        explanation: validated.explanation,
      })
      .eq('id', questionId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function deleteListQuestion(
  questionId: string,
  ownerWallet: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: question, error: qErr } = await supabase
      .from('questions')
      .select('id, list_id')
      .eq('id', questionId)
      .single();
    if (qErr || !question || !question.list_id) return { success: false, error: 'Question not found.' };

    const { error: ownerErr } = await getOwnedDraftList(question.list_id, ownerWallet);
    if (ownerErr) return { success: false, error: ownerErr };

    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function submitListForReview(
  listId: string,
  ownerWallet: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: ownerErr } = await getOwnedDraftList(listId, ownerWallet);
    if (ownerErr) return { success: false, error: ownerErr };

    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', listId);

    if ((count ?? 0) < MIN_LIST_QUESTIONS) {
      return {
        success: false,
        error: `A list needs at least ${MIN_LIST_QUESTIONS} questions before it can be submitted for review (currently ${count ?? 0}).`,
      };
    }

    const { error } = await supabase
      .from('question_lists')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', listId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function getListsPendingReview(viewerWallet: string): Promise<QuestionListWithMeta[]> {
  try {
    if (!viewerWallet) return [];
    const normalized = viewerWallet.toLowerCase();
    const { data: lists, error } = await supabase
      .from('question_lists')
      .select('*')
      .eq('status', 'submitted')
      .neq('owner_wallet', normalized)
      .order('submitted_at', { ascending: true });
    if (error || !lists) return [];

    return await attachListMeta(lists as QuestionList[], normalized);
  } catch (err) {
    console.error('getListsPendingReview error:', err);
    return [];
  }
}

export async function confirmList(
  listId: string,
  confirmerWallet: string
): Promise<{ success: boolean; approved?: boolean; error?: string }> {
  try {
    if (!confirmerWallet) return { success: false, error: 'Connect a wallet to confirm.' };
    const normalized = confirmerWallet.toLowerCase();

    const { data: list, error: listErr } = await supabase
      .from('question_lists')
      .select('owner_wallet, status')
      .eq('id', listId)
      .single();
    if (listErr || !list) return { success: false, error: 'List not found.' };
    if (list.status !== 'submitted') return { success: false, error: 'This list is not awaiting review.' };
    if (list.owner_wallet === normalized) return { success: false, error: 'You cannot confirm your own list.' };

    const { error: insertErr } = await supabase
      .from('question_list_confirmations')
      .insert({ list_id: listId, confirmer_wallet: normalized });

    if (insertErr) {
      if (insertErr.code === '23505' || insertErr.message.includes('unique')) {
        return { success: false, error: 'You have already confirmed this list.' };
      }
      return { success: false, error: insertErr.message };
    }

    const { count } = await supabase
      .from('question_list_confirmations')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', listId);

    const approved = (count ?? 0) >= REQUIRED_CONFIRMATIONS;
    if (approved) {
      await supabase.from('question_lists').update({ status: 'approved' }).eq('id', listId);
    }

    return { success: true, approved };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function startContest(
  listId: string,
  ownerWallet: string,
  rewardPoolWholeTokens: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!ownerWallet) return { success: false, error: 'Connect a wallet to start a contest.' };
    if (!rewardPoolWholeTokens || rewardPoolWholeTokens <= 0) {
      return { success: false, error: 'Reward pool must be a positive token amount.' };
    }

    const normalized = ownerWallet.toLowerCase();
    const { data: list, error: listErr } = await supabase
      .from('question_lists')
      .select('owner_wallet, status')
      .eq('id', listId)
      .single();
    if (listErr || !list) return { success: false, error: 'List not found.' };
    if (list.owner_wallet !== normalized) return { success: false, error: 'Only the owner can start this contest.' };
    if (list.status !== 'approved') {
      return { success: false, error: `List must be approved by ${REQUIRED_CONFIRMATIONS} reviewers before starting.` };
    }

    const rewardPoolWei = toWei(rewardPoolWholeTokens);

    const { error: questionsErr } = await supabase
      .from('questions')
      .update({ status: 'verified' })
      .eq('list_id', listId);
    if (questionsErr) return { success: false, error: questionsErr.message };

    const { error } = await supabase
      .from('question_lists')
      .update({
        status: 'live',
        reward_pool_tokens: rewardPoolWei.toString(),
        started_at: new Date().toISOString(),
      })
      .eq('id', listId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
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

    return await attachListMeta(lists as QuestionList[]);
  } catch (err) {
    console.error('getLiveLists error:', err);
    return [];
  }
}

export async function startListAttempt(
  listId: string,
  walletAddress: string
): Promise<{ success: boolean; questions?: ClientQuestion[]; error?: string }> {
  try {
    if (!walletAddress) return { success: false, error: 'Connect a wallet to play.' };
    const normalized = walletAddress.toLowerCase();

    const { data: list, error: listErr } = await supabase
      .from('question_lists')
      .select('status')
      .eq('id', listId)
      .single();
    if (listErr || !list || list.status !== 'live') {
      return { success: false, error: 'This contest is not live.' };
    }

    const { data: existingEntry } = await supabase
      .from('list_entries')
      .select('status')
      .eq('list_id', listId)
      .eq('wallet_address', normalized)
      .maybeSingle();

    if (existingEntry && existingEntry.status !== 'in_progress') {
      return { success: false, error: 'You have already completed this contest.' };
    }

    if (!existingEntry) {
      await supabase.from('list_entries').insert({ list_id: listId, wallet_address: normalized });
    }

    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('id, category, prompt, options, created_by, status')
      .eq('list_id', listId);
    if (qErr || !questions) return { success: false, error: 'Failed to load contest questions.' };

    return {
      success: true,
      questions: questions.map((row) => ({
        id: row.id,
        category: row.category,
        prompt: row.prompt,
        options: Array.isArray(row.options) ? (row.options as string[]) : [],
        created_by: row.created_by || null,
        status: row.status || 'verified',
      })),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function completeListAttempt(
  listId: string,
  walletAddress: string
): Promise<{ success: boolean; correctCount?: number; rewardAmount?: string; error?: string }> {
  try {
    if (!walletAddress) return { success: false, error: 'Connect a wallet to play.' };
    const normalized = walletAddress.toLowerCase();

    const { data: list, error: listErr } = await supabase
      .from('question_lists')
      .select('reward_pool_tokens')
      .eq('id', listId)
      .single();
    if (listErr || !list) return { success: false, error: 'List not found.' };

    const { data: questions } = await supabase.from('questions').select('id').eq('list_id', listId);
    const questionIds = (questions || []).map((q) => q.id);
    if (questionIds.length === 0) return { success: false, error: 'This contest has no questions.' };

    const { data: results } = await supabase
      .from('quiz_results')
      .select('is_correct')
      .eq('wallet_address', normalized)
      .in('question_id', questionIds);

    const correctCount = (results || []).filter((r) => r.is_correct).length;
    const perQuestionReward = BigInt(list.reward_pool_tokens || '0') / BigInt(questionIds.length);
    const rewardAmount = perQuestionReward * BigInt(correctCount);

    const { error } = await supabase
      .from('list_entries')
      .update({
        status: 'completed',
        correct_count: correctCount,
        reward_amount: rewardAmount.toString(),
        completed_at: new Date().toISOString(),
      })
      .eq('list_id', listId)
      .eq('wallet_address', normalized)
      .eq('status', 'in_progress');

    if (error) return { success: false, error: error.message };
    return { success: true, correctCount, rewardAmount: rewardAmount.toString() };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function claimListReward(
  listId: string,
  walletAddress: string
): Promise<RewardVoucher | { error: string }> {
  try {
    if (!walletAddress) return { error: 'Wallet address required' };
    const normalized = walletAddress.toLowerCase();

    const { data: entry, error } = await supabase
      .from('list_entries')
      .select('status, reward_amount')
      .eq('list_id', listId)
      .eq('wallet_address', normalized)
      .single();

    if (error || !entry) return { error: 'No contest entry found for this wallet.' };
    if (entry.status === 'claimed') return { error: 'Reward already claimed for this contest.' };
    if (entry.status !== 'completed') return { error: 'Finish the contest before claiming.' };

    const amount = BigInt(entry.reward_amount || '0');
    if (amount <= BigInt(0)) return { error: 'Nothing to claim for this contest.' };

    return buildTokenClaimVoucher(normalized, amount, listId);
  } catch (err: unknown) {
    console.error('claimListReward error:', err);
    return { error: 'Failed to generate voucher' };
  }
}

export async function markListRewardClaimed(
  listId: string,
  walletAddress: string
): Promise<{ success: boolean }> {
  try {
    if (!walletAddress) return { success: false };
    const { error } = await supabase
      .from('list_entries')
      .update({ status: 'claimed' })
      .eq('list_id', listId)
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('status', 'completed');
    return { success: !error };
  } catch {
    return { success: false };
  }
}
