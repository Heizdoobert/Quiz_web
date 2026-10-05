# lib/utils/validation.ts
lines:93 exports:isUuid,validateQuestionInput,normalizePrompt,escapeLikePattern
---
// Ids from the client are checked before they reach a query or a PostgREST filter string.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

// Shared prompt/option/explanation validation, reused by both the global
// single-question submission flow and list-contest questions
// so both go through the same quality bar.
const MAX_PROMPT = 300;
const MAX_OPTION = 120;
const MAX_EXPLANATION = 1000;
const MIN_CATEGORY = 2;
const MAX_CATEGORY = 40;

export function validateQuestionInput(params: {
  prompt: string;
  options: string[];
  correctIndex: number;
  category?: string;
  explanation?: string;
}):
  | { valid: true; prompt: string; options: string[]; correctIndex: number; category: string; explanation: string }
  | { valid: false; error: string } {
  const trimmedPrompt = typeof params.prompt === 'string' ? params.prompt.trim() : '';
  if (trimmedPrompt.length < 15) {
    return { valid: false, error: 'Question prompt must be at least 15 characters long.' };
  }
  if (trimmedPrompt.length > MAX_PROMPT) {
    return { valid: false, error: `Question prompt must be at most ${MAX_PROMPT} characters.` };
  }
  if (!Array.isArray(params.options) || params.options.length !== 4) {
    return { valid: false, error: 'Exactly 4 options are required.' };
  }
  if (params.options.some((opt) => typeof opt !== 'string' || !opt.trim())) {
    return { valid: false, error: 'All 4 options must be filled.' };
  }

  const trimmedOptions = params.options.map((o) => o.trim());
