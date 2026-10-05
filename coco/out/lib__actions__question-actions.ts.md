# lib/actions/question-actions.ts
lines:327 exports:createQuestion,fetchRandomQuestion,getTopics,getPublicQuestion,disputeQuestion,getQuestionCount,get5050EliminatedIndices
---
'use server';

import { supabase } from '@/lib/supabase/supabase';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { getSessionAccount } from '@/lib/services/session';
import { ClientQuestion } from '@/lib/types';
import { escapeLikePattern, isUuid, validateQuestionInput } from '@/lib/utils/validation';

const MAX_DISPUTE_REASON = 500;
const QUESTIONS_PER_DAY = 5;
const QUARANTINE_AT = 3;

import { ActionResult } from '@/lib/types';

import { logger } from '@/lib/logger';

export async function createQuestion(params: {
  prompt: string;
  options: string[];
  correctIndex: number;
  category?: string;
  explanation?: string;
}): Promise<ActionResult> {
  try {
    const account = await getSessionAccount();
    if (!account) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in to add questions.' } };
    }
    if (!supabaseAdmin) {
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Adding questions is unavailable right now.' } };
    }

    const validated = validateQuestionInput(params);
    if (!validated.valid) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: validated.error } };
    }

    // New questions go live at once and are moderated by disputes, so cap how fast one account adds them.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count, error: countErr } = await supabaseAdmin
