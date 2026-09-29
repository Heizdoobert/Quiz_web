'use server';

import { supabase } from '@/lib/supabase';
import { SearchResult } from '@/lib/types';

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

  const { data, error } = await supabase.rpc('search_questions', {
    p_query: q,
    p_limit: PAGE_SIZE + 1,
    p_offset: (Math.max(1, page) - 1) * PAGE_SIZE,
  });
  if (error || !data) {
    console.error('searchQuestions error:', error);
    return { results: [], hasMore: false };
  }

  const rows = data as SearchQuestionRow[];
  return {
    results: rows.slice(0, PAGE_SIZE).map(toSearchResult),
    hasMore: rows.length > PAGE_SIZE,
  };
}
