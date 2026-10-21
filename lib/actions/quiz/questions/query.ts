'use server';

import { countQuestions, listPublicQuestions, publicQuestion } from '@/lib/db/questions';
import { topics } from '@/lib/db/rpc';
import { logger } from '@/lib/logger';
import { ClientQuestion } from '@/lib/types';
import { isUuid } from '@/lib/utils/validation';

export async function fetchRandomQuestion(
  excludeIds: string[] = [],
  category?: string
): Promise<ClientQuestion | null> {
  try {
    const ids = (Array.isArray(excludeIds) ? excludeIds : []).filter(isUuid).slice(-200);
    const named = category && category !== 'All' ? category : undefined;
    // Each step falls back to a wider pool, so one failed read is logged and treated as empty.
    const list = (opts: Parameters<typeof listPublicQuestions>[0]) =>
      listPublicQuestions(opts).catch((err) => {
        logger.error('fetch_random_question_query_failed', err, { category });
        return [];
      });

    let data = await list({ excludeIds: ids, category: named, limit: 20 });
    if (data.length === 0 && named) {
      logger.info('fetch_random_question_fallback_triggered', { category, excludedCount: ids.length });
      data = await list({ category: named, limit: 20 });
    }
    if (data.length === 0) {
      logger.info('fetch_random_question_general_fallback_triggered', { category });
      data = await list({ limit: 20 });
      if (data.length === 0) {
        logger.warn('fetch_random_question_exhausted', { category });
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
      created_by: row.created_by_user || null,
      status: row.status || 'verified',
    };
  } catch (err) {
    logger.error('fetch_random_question_unexpected_error', err, { category });
    return null;
  }
}

export async function getTopics(): Promise<Array<{ slug: string; name: string; questionCount: number; latestAt: string }>> {
  try {
    return (await topics()).map((row) => ({
      slug: row.slug,
      name: row.name,
      questionCount: row.question_count,
      latestAt: row.latest_at,
    }));
  } catch (err) {
    logger.error('getTopics error:', err);
    return [];
  }
}

export async function getPublicQuestion(id: string): Promise<ClientQuestion | null> {
  try {
    if (!isUuid(id)) return null;
    const data = await publicQuestion(id);
    if (!data) return null;
    return {
      id: data.id,
      category: data.category,
      prompt: data.prompt,
      options: Array.isArray(data.options) ? (data.options as string[]) : [],
      created_by: data.created_by_user || null,
      status: data.status || 'verified',
    };
  } catch (err) {
    logger.error('getPublicQuestion error:', err);
    return null;
  }
}

export async function getQuestionCount(): Promise<number> {
  try {
    return await countQuestions();
  } catch (err) {
    logger.error('getQuestionCount error:', err);
    return 0;
  }
}
