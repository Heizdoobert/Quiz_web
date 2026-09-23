'use server';

import { supabase } from '@/lib/supabase';
import { ClientQuestion, Question } from '@/lib/types';

// Shared prompt/option/explanation validation, reused by both the global
// single-question submission flow (below) and list-contest questions
// (addListQuestion in question-list-actions.ts) so both go through the
// same quality bar.
export function validateQuestionInput(params: {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}):
  | { valid: true; prompt: string; options: string[]; explanation: string }
  | { valid: false; error: string } {
  const trimmedPrompt = params.prompt?.trim() || '';
  if (trimmedPrompt.length < 15) {
    return { valid: false, error: 'Question prompt must be at least 15 characters long.' };
  }
  if (!Array.isArray(params.options) || params.options.length !== 4) {
    return { valid: false, error: 'Exactly 4 options are required.' };
  }
  if (params.options.some((opt) => !opt?.trim())) {
    return { valid: false, error: 'All 4 options must be filled.' };
  }

  const trimmedOptions = params.options.map((o) => o.trim());
  const lowerOptions = new Set(trimmedOptions.map((o) => o.toLowerCase()));
  if (lowerOptions.size !== 4) {
    return { valid: false, error: 'All 4 options must be distinct from one another.' };
  }

  if (params.correctIndex < 0 || params.correctIndex > 3) {
    return { valid: false, error: 'Correct option must be between 0 and 3.' };
  }

  const trimmedExplanation = params.explanation?.trim() || '';
  if (trimmedExplanation.length < 20) {
    return {
      valid: false,
      error: 'An educational explanation of at least 20 characters is required to ensure quiz quality.',
    };
  }

  return { valid: true, prompt: trimmedPrompt, options: trimmedOptions, explanation: trimmedExplanation };
}

// Normalizes a prompt for duplicate/spam detection: case-insensitive,
// whitespace-collapsed comparison so re-typing the same question with
// different spacing/casing still counts as a duplicate.
export function normalizePrompt(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function createQuestion(params: {
  prompt: string;
  options: string[];
  correctIndex: number;
  category?: string;
  explanation?: string;
  createdBy?: string;
}): Promise<{ success: boolean; question?: Question; error?: string }> {
  try {
    const validated = validateQuestionInput(params);
    if (!validated.valid) {
      return { success: false, error: validated.error };
    }
    const { prompt: trimmedPrompt, options: trimmedOptions, explanation: trimmedExplanation } = validated;

    const newQuestion = {
      prompt: trimmedPrompt,
      options: trimmedOptions,
      correct_index: params.correctIndex,
      category: params.category?.trim() || 'General',
      explanation: trimmedExplanation,
      created_by: params.createdBy?.toLowerCase() || null,
      status: 'verified',
      dispute_count: 0,
    };

    const { data, error } = await supabase
      .from('questions')
      .insert(newQuestion)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, question: data as Question };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function fetchRandomQuestion(
  excludeIds: string[] = [],
  category?: string
): Promise<ClientQuestion | null> {
  try {
    let query = supabase
      .from('questions')
      .select('id, category, prompt, options, created_by, status')
      .neq('status', 'quarantined')
      .neq('status', 'pending'); // list-contest questions stay hidden until their list goes live

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
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
        .neq('status', 'quarantined')
        .neq('status', 'pending')
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
        .neq('status', 'quarantined')
        .neq('status', 'pending')
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
  reporterWallet: string;
  reason: string;
}): Promise<{ success: boolean; quarantined?: boolean; error?: string }> {
  try {
    if (!params.questionId || !params.reporterWallet || !params.reason?.trim()) {
      return { success: false, error: 'Question ID, wallet, and dispute reason are required.' };
    }
    const wallet = params.reporterWallet.toLowerCase();

    // Record dispute
    const { error: disputeErr } = await supabase.from('question_disputes').insert({
      question_id: params.questionId,
      reporter_wallet: wallet,
      reason: params.reason.trim(),
    });

    if (disputeErr) {
      if (disputeErr.code === '23505' || disputeErr.message.includes('unique')) {
        return { success: false, error: 'You have already reported this question.' };
      }
      return { success: false, error: disputeErr.message };
    }

    // Fetch and increment dispute_count
    const { data: qData } = await supabase
      .from('questions')
      .select('dispute_count')
      .eq('id', params.questionId)
      .single();

    const currentCount = qData?.dispute_count ?? 0;
    const nextCount = currentCount + 1;
    const isQuarantined = nextCount >= 3;

    await supabase
      .from('questions')
      .update({
        dispute_count: nextCount,
        ...(isQuarantined ? { status: 'quarantined' } : {}),
      })
      .eq('id', params.questionId);

    return { success: true, quarantined: isQuarantined };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function getQuestionCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function get5050EliminatedIndices(questionId: string): Promise<number[]> {
  try {
    const { data } = await supabase
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

