'use server';

import { supabase } from '@/lib/supabase';
import { SearchResult } from '@/lib/types';
import { escapeLikePattern } from '@/lib/validation';

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
  const { data, error } = await supabase
    .from('questions')
    .select('id, prompt, category, created_at, users(display_name)')
    .eq('status', 'verified')
    .is('list_id', null)
    .ilike('category', escapeLikePattern(topic))
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE);
  if (error || !data) {
    console.error('getTopicQuestions error:', error);
    return { results: [], hasMore: false };
  }

  const rows = data as unknown as TopicQuestionRow[];
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
