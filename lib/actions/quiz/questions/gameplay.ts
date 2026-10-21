'use server';

import { answerKey } from '@/lib/db/questions';
import { logger } from '@/lib/logger';
import { isUuid } from '@/lib/utils/validation';

export async function get5050EliminatedIndices(questionId: string): Promise<number[]> {
  try {
    // correct_index is only readable with the secret key.
    if (!isUuid(questionId)) return [];
    const data = await answerKey(questionId);
    if (!data || typeof data.correct_index !== 'number' || data.correct_index < 0 || data.correct_index > 3) {
      return [];
    }
    // Eliminating two wrong options narrows the answer to one of two, so this is only offered for
    // public verified questions (whose answers submitAnswer shows anyway). Pending and
    // quarantined questions reveal nothing.
    if (data.status !== 'verified') return [];
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
  } catch (err) {
    logger.error('get5050EliminatedIndices error:', err);
    return [];
  }
}
