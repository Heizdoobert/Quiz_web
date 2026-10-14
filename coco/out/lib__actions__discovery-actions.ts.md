# lib/actions/discovery-actions.ts
lines:87 exports:searchQuestions,getTopicQuestions
---
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
