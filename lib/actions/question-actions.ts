'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionAccount } from '@/lib/session';
import { ClientQuestion } from '@/lib/types';
import { isUuid, validateQuestionInput } from '@/lib/validation';

const MAX_DISPUTE_REASON = 500;
const QUESTIONS_PER_DAY = 5;
const QUARANTINE_AT = 3;

export async function createQuestion(params: {
  prompt: string;
  options: string[];
  correctIndex: number;
  category?: string;
  explanation?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const account = await getSessionAccount();
    if (!account) return { success: false, error: 'Sign in to add questions.' };
    if (!supabaseAdmin) return { success: false, error: 'Adding questions is unavailable right now.' };

    const validated = validateQuestionInput(params);
    if (!validated.valid) return { success: false, error: validated.error };

    // New questions go live at once and are moderated by disputes, so cap how fast one account adds them.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count, error: countErr } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_user', account.id)
      .gte('created_at', since);
    if (countErr) {
      console.error('createQuestion count error:', countErr);
      return { success: false, error: 'Failed to add question.' };
    }
    if ((count ?? 0) >= QUESTIONS_PER_DAY) {
      return { success: false, error: `You can add up to ${QUESTIONS_PER_DAY} questions per day.` };
    }

    // wallet_address (created_by) is written directly too, same as quiz-actions.ts's quiz_results
    // insert, so readers of the old column stay correct until it's dropped in Task 25.
    const { error } = await supabaseAdmin.from('questions').insert({
      prompt: validated.prompt,
      options: validated.options,
      correct_index: validated.correctIndex,
      category: validated.category,
      explanation: validated.explanation,
      created_by_user: account.id,
      created_by: account.wallet,
      status: 'verified',
      dispute_count: 0,
    });
    if (error) {
      console.error('createQuestion insert error:', error);
      return { success: false, error: 'Failed to add question.' };
    }

    return { success: true };
  } catch (err) {
    console.error('createQuestion error:', err);
    return { success: false, error: 'Failed to add question.' };
  }
}

export async function fetchRandomQuestion(
  excludeIds: string[] = [],
  category?: string
): Promise<ClientQuestion | null> {
  try {
    // Public-question rule: verified and not part of a question list (a list's
    // questions stay hidden until played through that list).
    let query = supabase
      .from('questions')
      .select('id, category, prompt, options, created_by, status')
      .eq('status', 'verified')
      .is('list_id', null);

    // Only well-formed ids reach the filter string; the newest 200 are enough to avoid repeats.
    const ids = (Array.isArray(excludeIds) ? excludeIds : []).filter(isUuid).slice(-200);
    if (ids.length > 0) {
      query = query.not('id', 'in', `(${ids.join(',')})`);
    }

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    let { data, error } = await query.limit(20);

    // Graceful fallback if specific category with excludeIds returned no rows
    if ((error || !data || data.length === 0) && category && category !== 'All') {
      const fallbackQuery = supabase
        .from('questions')
        .select('id, category, prompt, options, created_by, status')
        .eq('status', 'verified')
        .is('list_id', null)
        .eq('category', category)
        .limit(20);
      const fallbackRes = await fallbackQuery;
      if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
        data = fallbackRes.data;
        error = null;
      }
    }

    // Ultimate fallback if still no question found
    if (error || !data || data.length === 0) {
      const generalQuery = await supabase
        .from('questions')
        .select('id, category, prompt, options, created_by, status')
        .eq('status', 'verified')
        .is('list_id', null)
        .limit(20);
      if (generalQuery.data && generalQuery.data.length > 0) {
        data = generalQuery.data;
      } else {
        return null;
      }
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    const row = data[randomIndex];
    return {
      id: row.id,
      category: row.category,
      prompt: row.prompt,
      options: Array.isArray(row.options) ? (row.options as string[]) : [],
      created_by: row.created_by || null,
      status: row.status || 'verified',
    };
  } catch (err) {
    console.error('fetchRandomQuestion error:', err);
    return null;
  }
}

export async function disputeQuestion(params: {
  questionId: string;
  reason: string;
}): Promise<{ success: boolean; quarantined?: boolean; error?: string }> {
  try {
    const reason = params.reason?.trim() || '';
    if (!isUuid(params.questionId) || !reason) {
      return { success: false, error: 'Question and dispute reason are required.' };
    }
    if (reason.length > MAX_DISPUTE_REASON) {
      return { success: false, error: `Dispute reason must be at most ${MAX_DISPUTE_REASON} characters.` };
    }
    const account = await getSessionAccount();
    if (!account) return { success: false, error: 'Sign in to report questions.' };
    if (!supabaseAdmin) return { success: false, error: 'Reporting is unavailable right now.' };

    // Only players whose answer to this question was recorded may report it,
    // so a quarantine takes signed-in accounts that actually played it.
    const { data: answered, error: answeredErr } = await supabaseAdmin
      .from('quiz_results')
      .select('id')
      .eq('user_id', account.id)
      .eq('question_id', params.questionId)
      .limit(1);
    if (answeredErr) {
      console.error('disputeQuestion answered check error:', answeredErr);
      return { success: false, error: 'Failed to submit dispute.' };
    }
    if (!answered?.length) {
      return { success: false, error: 'Answer this question before reporting it.' };
    }

    const { error: disputeErr } = await supabaseAdmin.from('question_disputes').insert({
      question_id: params.questionId,
      reporter_user: account.id,
      reporter_wallet: account.wallet,
      reason,
    });
    if (disputeErr) {
      if (disputeErr.code === '23505') {
        return { success: false, error: 'You have already reported this question.' };
      }
      console.error('disputeQuestion insert error:', disputeErr);
      return { success: false, error: 'Failed to submit dispute.' };
    }

    // Count dispute rows instead of incrementing, so concurrent reports can't lose an update.
    const { count, error: countErr } = await supabaseAdmin
      .from('question_disputes')
      .select('id', { count: 'exact', head: true })
      .eq('question_id', params.questionId);
    if (countErr) {
      console.error('disputeQuestion count error:', countErr);
      return { success: true, quarantined: false };
    }
    const disputeCount = count ?? 0;
    const quarantined = disputeCount >= QUARANTINE_AT;
    const { error: updateErr } = await supabaseAdmin
      .from('questions')
      .update({ dispute_count: disputeCount, ...(quarantined ? { status: 'quarantined' } : {}) })
      .eq('id', params.questionId);
    if (updateErr) console.error('disputeQuestion update error:', updateErr);

    return { success: true, quarantined: quarantined && !updateErr };
  } catch (err) {
    console.error('disputeQuestion error:', err);
    return { success: false, error: 'Failed to submit dispute.' };
  }
}

export async function getQuestionCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true });
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function get5050EliminatedIndices(questionId: string): Promise<number[]> {
  try {
    // correct_index is only readable with the secret key.
    if (!supabaseAdmin) return [0, 1];
    const { data } = await supabaseAdmin
      .from('questions')
      .select('correct_index')
      .eq('id', questionId)
      .single();
    if (!data) return [0, 1];
    const wrong = [0, 1, 2, 3].filter((idx) => idx !== data.correct_index);

    // Deterministic selection based on questionId hash so repeat calls return the exact same 2 wrong answers
    let hash = 0;
    for (let i = 0; i < questionId.length; i++) {
      hash = (hash * 31 + questionId.charCodeAt(i)) >>> 0;
    }
    const firstIndex = hash % wrong.length;
    const first = wrong[firstIndex];
    const remaining = wrong.filter((_, i) => i !== firstIndex);
    const second = remaining[(hash >>> 4) % remaining.length];
    return [first, second].sort((a, b) => a - b);
  } catch {
    return [0, 1];
  }
}
