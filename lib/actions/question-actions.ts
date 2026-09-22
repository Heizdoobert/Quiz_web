'use server';

import { supabase } from '@/lib/supabase';
import { ClientQuestion, Question } from '@/lib/types';

export async function createQuestion(params: {
  prompt: string;
  options: string[];
  correctIndex: number;
  category?: string;
  explanation?: string;
  createdBy?: string;
}): Promise<{ success: boolean; question?: Question; error?: string }> {
  try {
    if (!params.prompt?.trim()) {
      return { success: false, error: 'Question prompt is required.' };
    }
    if (!Array.isArray(params.options) || params.options.length !== 4) {
      return { success: false, error: 'Exactly 4 options are required.' };
    }
    if (params.options.some((opt) => !opt?.trim())) {
      return { success: false, error: 'All 4 options must be filled.' };
    }
    if (params.correctIndex < 0 || params.correctIndex > 3) {
      return { success: false, error: 'Correct option must be between 0 and 3.' };
    }

    const newQuestion = {
      prompt: params.prompt.trim(),
      options: params.options.map((o) => o.trim()),
      correct_index: params.correctIndex,
      category: params.category?.trim() || 'General',
      explanation: params.explanation?.trim() || null,
      created_by: params.createdBy?.toLowerCase() || null,
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
  excludeIds: string[] = []
): Promise<ClientQuestion | null> {
  try {
    let query = supabase.from('questions').select('id, category, prompt, options');

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query.limit(20);
    if (error || !data || data.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    const row = data[randomIndex];
    return {
      id: row.id,
      category: row.category,
      prompt: row.prompt,
      options: Array.isArray(row.options) ? (row.options as string[]) : [],
    };
  } catch (err) {
    console.error('fetchRandomQuestion error:', err);
    return null;
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
    return wrong.sort(() => 0.5 - Math.random()).slice(0, 2);
  } catch {
    return [0, 1];
  }
}

