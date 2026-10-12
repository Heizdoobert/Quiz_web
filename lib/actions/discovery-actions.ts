'use server';

import { listTopicQuestions } from '@/lib/db/questions';
import { searchQuestionsRpc } from '@/lib/db/rpc';
import { SearchResult } from '@/lib/types';
import { logger } from '@/lib/logger';

const PAGE_SIZE = 20;

interface SearchQuestionRow {
  id: string;
  prompt: string;
  category: string;
  author_name: string;
  created_at: string;
  score: number;
}

function toSearchResult(row: SearchQuestionRow): SearchResult {
  return {
    id: row.id,
    prompt: row.prompt,
    category: row.category,
    authorName: row.author_name,
    createdAt: row.created_at,
    score: row.score,
  };
}

export async function searchQuestions(
  query: string,
  page = 1
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const q = query.trim();
  if (q.length < 2 || q.length > 100) return { results: [], hasMore: false };

  let rows: SearchQuestionRow[];
  try {
    rows = (await searchQuestionsRpc(q, PAGE_SIZE + 1, (Math.max(1, page) - 1) * PAGE_SIZE)) as SearchQuestionRow[];
  } catch (err) {
    logger.error('searchQuestions error:', err);
    return { results: [], hasMore: false };
  }

  return {
    results: rows.slice(0, PAGE_SIZE).map(toSearchResult),
    hasMore: rows.length > PAGE_SIZE,
  };
}

interface TopicQuestionRow {
  id: string;
  prompt: string;
  category: string;
  created_at: string;
  users: { display_name: string | null } | null;
}

export async function getTopicQuestions(
  topic: string,
  page = 1
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;

  // Public-question rule (status = 'verified' AND list_id IS NULL), same as
  // fetchRandomQuestion/getPublicQuestion. Topics group categories
  // case-insensitively (get_topics()), so this must match every casing too.
  let rows: TopicQuestionRow[];
  try {
    rows = (await listTopicQuestions(topic, offset, PAGE_SIZE)) as TopicQuestionRow[];
  } catch (err) {
    logger.error('getTopicQuestions error:', err);
    return { results: [], hasMore: false };
  }

  return {
    results: rows.slice(0, PAGE_SIZE).map((row) => ({
      id: row.id,
      prompt: row.prompt,
      category: row.category,
      authorName: row.users?.display_name || 'Player',
      createdAt: row.created_at,
      score: 0,
    })),
    hasMore: rows.length > PAGE_SIZE,
  };
}
