'use server';

import {
  listSuggestionsForAuthor,
  markSuggestionResolved,
  suggestionForResolve,
} from '@/lib/db/community';
import { getSessionAccount, type SessionAccount } from '@/lib/services/auth/session';
import { isUuid } from '@/lib/utils/validation';
import { logger } from '@/lib/logger';
import type { CommunityResult, SuggestionView } from './types';

export async function resolveSuggestion(
  commentId: string,
  authAccount?: SessionAccount
): Promise<CommunityResult> {
  const account = authAccount ?? (await getSessionAccount());
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  if (!isUuid(commentId)) return { ok: false, code: 'INVALID' };
  let existing: { kind?: string; questions?: unknown } | null;
  try {
    existing = (await suggestionForResolve(commentId)) as { kind?: string; questions?: unknown } | null;
  } catch (err) {
    logger.error('resolveSuggestion lookup error:', err);
    return { ok: false, code: 'NOT_ALLOWED' };
  }
  if (!existing || existing.kind !== 'suggestion') return { ok: false, code: 'NOT_ALLOWED' };

  const question = (Array.isArray(existing.questions) ? existing.questions[0] : existing.questions) as
    | { created_by_user?: string }
    | undefined;
  if (!question || question.created_by_user !== account.id) {
    return { ok: false, code: 'NOT_ALLOWED' };
  }

  try {
    await markSuggestionResolved(commentId);
  } catch (err) {
    logger.error('resolveSuggestion error:', err);
    return { ok: false, code: 'FAILED' };
  }
  return { ok: true };
}

export async function getSuggestionsForAuthor(
  accountId?: string,
  authAccount?: SessionAccount
): Promise<SuggestionView[]> {
  const account = authAccount ?? (await getSessionAccount());
  if (!account) return [];
  const targetId = accountId ?? account.id;
  if (account.id !== targetId) return [];
  if (!isUuid(targetId)) return [];

  let data: unknown[];
  try {
    data = await listSuggestionsForAuthor(account.id);
  } catch (err) {
    logger.error('getSuggestionsForAuthor error:', err);
    return [];
  }

  const rows = data as Array<{
    id: string;
    question_id: string;
    body: string;
    created_at: string;
    resolved_at: string | null;
    questions?: { prompt?: string } | Array<{ prompt?: string }>;
    users?: { display_name?: string | null } | Array<{ display_name?: string | null }> | null;
  }>;

  return rows.map((r) => {
    const q = Array.isArray(r.questions) ? r.questions[0] : r.questions;
    const u = Array.isArray(r.users) ? r.users[0] : r.users;
    const promptText = q?.prompt || '';
    return {
      id: r.id,
      questionId: r.question_id,
      prompt: promptText,
      questionPrompt: promptText,
      body: r.body,
      senderName: u?.display_name || 'Player',
      createdAt: r.created_at,
      resolvedAt: r.resolved_at || null,
    };
  });
}
