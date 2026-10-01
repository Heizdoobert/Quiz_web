# lib/actions/question-actions.ts
lines:289 exports:createQuestion,fetchRandomQuestion,getTopics,getPublicQuestion,disputeQuestion,getQuestionCount,get5050EliminatedIndices
---
'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionAccount } from '@/lib/session';
import { ClientQuestion } from '@/lib/types';
import { escapeLikePattern, isUuid, validateQuestionInput } from '@/lib/validation';

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
