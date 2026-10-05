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
  if (trimmedOptions.some((opt) => opt.length > MAX_OPTION)) {
    return { valid: false, error: `Each option must be at most ${MAX_OPTION} characters.` };
  }
  const lowerOptions = new Set(trimmedOptions.map((o) => o.toLowerCase()));
  if (lowerOptions.size !== 4) {
    return { valid: false, error: 'All 4 options must be distinct from one another.' };
  }

  if (!Number.isInteger(params.correctIndex) || params.correctIndex < 0 || params.correctIndex > 3) {
    return { valid: false, error: 'Correct option must be between 0 and 3.' };
  }

  // Collapsed to single spaces so "DeFi" and "De  Fi" don't become distinct topics.
  const rawCategory = typeof params.category === 'string' ? params.category.trim().replace(/\s+/g, ' ') : '';
  const category = rawCategory || 'General';
  if (category.length < MIN_CATEGORY || category.length > MAX_CATEGORY) {
    return { valid: false, error: `Category must be between ${MIN_CATEGORY} and ${MAX_CATEGORY} characters.` };
  }

  const trimmedExplanation = typeof params.explanation === 'string' ? params.explanation.trim() : '';
  if (trimmedExplanation.length < 20) {
    return {
      valid: false,
      error: 'An educational explanation of at least 20 characters is required to ensure quiz quality.',
    };
  }
  if (trimmedExplanation.length > MAX_EXPLANATION) {
    return { valid: false, error: `Explanation must be at most ${MAX_EXPLANATION} characters.` };
  }

  return {
    valid: true,
    prompt: trimmedPrompt,
    options: trimmedOptions,
    correctIndex: params.correctIndex,
    category,
    explanation: trimmedExplanation,
  };
}

// Normalizes a prompt for duplicate/spam detection: case-insensitive,
// whitespace-collapsed comparison so re-typing the same question with
// different spacing/casing still counts as a duplicate.
export function normalizePrompt(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Escapes ILIKE wildcards so a category used as a case-insensitive exact-match
// pattern (topics are grouped case-insensitively, e.g. "DeFi" and "defi") can't
// have a stray "%" or "_" in a player-typed category matched as a wildcard.
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
